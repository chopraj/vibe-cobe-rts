import { logger } from '../utils/logger.js';
import { createOpencode } from '@opencode-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { AgentDetailedState, AgentActivity, PendingPermission, AgentTodo } from '../types/index.js';

const execAsync = promisify(exec);

// Timeout for agent sessions (2 hours)
const AGENT_TIMEOUT_MS = 2 * 60 * 60 * 1000;

// Health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL_MS = 30 * 1000;

// Type for the SDK's server and client
type OpencodeInstance = Awaited<ReturnType<typeof createOpencode>>;

export interface AgentSession {
  agentId: string;
  worktreePath: string;
  sessionId: string | null;
  status: 'working' | 'success' | 'failed';
  // SDK client and server
  client: OpencodeInstance['client'] | null;
  server: OpencodeInstance['server'] | null;
  serverPort: number | null;
  abortController: AbortController | null;
  timeoutId: NodeJS.Timeout | null;
  healthCheckId: NodeJS.Timeout | null;
  startedAt: Date;
  // Real-time detailed state
  detailedState: AgentDetailedState;
}

export type AgentEventCallback = (
  agentId: string,
  event: 'working' | 'success' | 'failed' | 'progress',
  data?: unknown
) => void;

// Helper to create initial detailed state
function createInitialDetailedState(): AgentDetailedState {
  return {
    activity: 'initializing',
    tokens: { input: 0, output: 0, reasoning: 0 },
    todos: [],
    stepsCompleted: 0,
    filesModified: [],
    linesAdded: 0,
    linesDeleted: 0,
    errorCount: 0,
    retryCount: 0,
    isFinished: false,
  };
}

export class OpenCodeService {
  private activeSessions: Map<string, AgentSession> = new Map();
  private isShuttingDown: boolean = false;
  private nextPort: number = 4096;
  // Mutex to serialize process.chdir() operations (SDK doesn't support cwd option yet)
  private chdirMutex: Promise<void> = Promise.resolve();

  async startSession(
    agentId: string,
    worktreePath: string,
    issueTitle: string,
    issueBody: string,
    onEvent: AgentEventCallback
  ): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn(`[${agentId}] Cannot start session - service is shutting down`);
      onEvent(agentId, 'failed', { error: 'Service is shutting down' });
      return;
    }

    logger.info(`Starting OpenCode SDK session for agent ${agentId} in ${worktreePath}`);

    const agentSession: AgentSession = {
      agentId,
      worktreePath,
      sessionId: null,
      status: 'working',
      client: null,
      server: null,
      serverPort: null,
      abortController: new AbortController(),
      timeoutId: null,
      healthCheckId: null,
      startedAt: new Date(),
      detailedState: createInitialDetailedState(),
    };

    this.activeSessions.set(agentId, agentSession);

    // Set up timeout
    agentSession.timeoutId = setTimeout(() => {
      this.handleTimeout(agentId, onEvent);
    }, AGENT_TIMEOUT_MS);

    // Run the session asynchronously
    this.runSession(agentSession, issueTitle, issueBody, onEvent).catch((error) => {
      logger.error(`Session ${agentId} failed with error:`, error);
    });
  }

  private async handleTimeout(agentId: string, onEvent: AgentEventCallback): Promise<void> {
    const session = this.activeSessions.get(agentId);
    if (!session || session.status !== 'working') {
      return;
    }

    logger.warn(`[${agentId}] Session timed out after ${AGENT_TIMEOUT_MS / 1000 / 60} minutes`);
    session.status = 'failed';
    onEvent(agentId, 'failed', { error: 'Session timed out' });

    await this.forceKillSession(session);
    this.activeSessions.delete(agentId);
  }

  private async runSession(
    agentSession: AgentSession,
    issueTitle: string,
    issueBody: string,
    onEvent: AgentEventCallback
  ): Promise<void> {
    const { agentId, worktreePath, abortController } = agentSession;
    const startTime = Date.now();

    try {
      logger.info(`[${agentId}] Creating OpenCode server and client...`);

      // Assign a unique port for this agent
      const port = this.nextPort++;
      agentSession.serverPort = port;

      // Create OpenCode server and client using SDK
      // We need to change to the worktree directory before creating the server
      // Use mutex to prevent race condition - multiple concurrent chdir() calls corrupt global state
      let opencode: OpencodeInstance;
      const createServer = async (): Promise<OpencodeInstance> => {
        const originalCwd = process.cwd();
        process.chdir(worktreePath);
        try {
          return await createOpencode({
            port,
            timeout: 15000, // 15 seconds to start server
          });
        } finally {
          process.chdir(originalCwd);
        }
      };

      // Chain onto the mutex to serialize chdir operations
      opencode = await new Promise<OpencodeInstance>((resolve, reject) => {
        this.chdirMutex = this.chdirMutex
          .then(() => createServer())
          .then(resolve)
          .catch(reject);
      });

      agentSession.client = opencode.client;
      agentSession.server = opencode.server;

      logger.info(`[${agentId}] Server started at ${opencode.server.url} (port ${port})`);

      // Start health check
      agentSession.healthCheckId = setInterval(() => {
        this.performHealthCheck(agentId);
      }, HEALTH_CHECK_INTERVAL_MS);

      // Check if cancelled during initialization
      if (abortController?.signal.aborted) {
        logger.info(`[${agentId}] Session cancelled during initialization`);
        await this.cleanupSession(agentSession);
        return;
      }

      // Create a new session
      const session = await opencode.client.session.create({
        body: { title: `Fix issue #${issueTitle}` },
      });

      if (!session.data) {
        throw new Error('Failed to create session - no data returned');
      }

      agentSession.sessionId = session.data.id;
      logger.info(`[${agentId}] Session created: ${session.data.id}`);

      // Check if cancelled before sending prompt
      if (abortController?.signal.aborted) {
        logger.info(`[${agentId}] Session cancelled before prompt`);
        await this.cleanupSession(agentSession);
        return;
      }

      // Build the prompt message
      const message = `Fix this GitHub issue:

Title: ${issueTitle}

Description:
${issueBody}

Please analyze the codebase, implement a fix, and make the necessary changes. When you're done, make sure all changes are saved.`;

      logger.info(`[${agentId}] Sending prompt to agent...`);

      // Update state to show we're starting
      agentSession.detailedState.activity = 'responding';
      onEvent(agentId, 'progress', { detailedState: agentSession.detailedState });

      // Send the prompt and wait for completion
      const sessionId = session.data.id;

      // Start event subscription in parallel with prompt
      const eventPromise = this.subscribeToEvents(
        agentSession,
        opencode.client,
        sessionId,
        (state) => {
          // Emit progress event whenever state changes
          onEvent(agentId, 'progress', { detailedState: state });
        },
        abortController!.signal
      );

      // Run prompt (this blocks until agent finishes)
      const result = await opencode.client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: 'text', text: message }],
        },
      });

      // Signal event subscription to stop (prompt finished)
      abortController?.abort();

      // Wait for event subscription to clean up
      await eventPromise.catch(() => {});

      // Mark as finished now that prompt() returned
      agentSession.detailedState.isFinished = true;
      agentSession.detailedState.completedAt = Date.now();
      agentSession.detailedState.activity = 'completed';
      onEvent(agentId, 'progress', { detailedState: agentSession.detailedState });

      // Check if cancelled during execution
      if (agentSession.status !== 'working') {
        logger.info(`[${agentId}] Session was cancelled during execution`);
        return;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`[${agentId}] Agent completed in ${duration}s, checking for changes...`);

      // Check if files were modified using git status
      const hasChanges = await this.checkForChanges(worktreePath);

      if (hasChanges) {
        agentSession.status = 'success';
        onEvent(agentId, 'success', { duration });
        logger.info(`[${agentId}] ✅ COMPLETED SUCCESSFULLY - files were modified (${duration}s)`);
      } else {
        agentSession.status = 'failed';
        onEvent(agentId, 'failed', { error: 'No files were modified' });
        logger.warn(`[${agentId}] ❌ FAILED - no files were modified (${duration}s)`);
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if this was a cancellation
      if (abortController?.signal.aborted) {
        logger.info(`[${agentId}] Session was cancelled`);
        return;
      }

      agentSession.status = 'failed';
      onEvent(agentId, 'failed', { error: errorMessage });
      logger.error(`[${agentId}] ❌ FAILED with error (${duration}s): ${errorMessage}`);
    } finally {
      await this.cleanupSession(agentSession);
      this.activeSessions.delete(agentId);
    }
  }

  private async checkForChanges(worktreePath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: worktreePath });
      const hasChanges = stdout.trim().length > 0;
      logger.info(`[checkForChanges] ${worktreePath}: ${hasChanges ? 'changes detected' : 'no changes'}`);
      return hasChanges;
    } catch (error) {
      logger.warn(`[checkForChanges] Failed to check git status: ${error}`);
      return false;
    }
  }

  /**
   * Subscribe to SDK events and update agent state in real-time
   */
  private async subscribeToEvents(
    agentSession: AgentSession,
    client: OpencodeInstance['client'],
    sessionId: string,
    onStateChange: (state: AgentDetailedState) => void,
    signal: AbortSignal
  ): Promise<void> {
    const { agentId } = agentSession;

    try {
      logger.info(`[${agentId}] Starting event subscription for session ${sessionId}`);
      const events = await client.event.subscribe();

      for await (const event of events.stream) {
        if (signal.aborted) {
          logger.debug(`[${agentId}] Event subscription aborted`);
          break;
        }

        // Debug log all events
        const evt = event as { type: string; properties: Record<string, unknown> };
        logger.debug(`[${agentId}] Event: ${evt.type}`, JSON.stringify(evt.properties, null, 2).slice(0, 500));

        // Process the event and update state
        const updated = this.processEvent(agentSession, sessionId, event);
        if (updated) {
          onStateChange(agentSession.detailedState);
        }
      }
    } catch (error) {
      if (signal.aborted) {
        // Expected when we abort the subscription
        return;
      }
      logger.warn(`[${agentId}] Event subscription error:`, error);
    }
  }

  /**
   * Process a single SDK event and update the agent's detailed state
   * Returns true if state was updated
   */
  private processEvent(
    agentSession: AgentSession,
    sessionId: string,
    event: unknown
  ): boolean {
    const { agentId, detailedState } = agentSession;
    const evt = event as { type: string; properties: Record<string, unknown> };

    // Helper to check if event belongs to our session
    const isOurSession = (props: Record<string, unknown>): boolean => {
      // Check direct sessionID
      if (props.sessionID === sessionId) return true;
      // Check nested in part
      if (props.part && (props.part as Record<string, unknown>).sessionID === sessionId) return true;
      // Check nested in info
      if (props.info && (props.info as Record<string, unknown>).sessionID === sessionId) return true;
      return false;
    };

    if (!isOurSession(evt.properties)) {
      return false;
    }

    // Helper to update activity only if not finished
    const setActivity = (activity: AgentActivity) => {
      if (!detailedState.isFinished) {
        detailedState.activity = activity;
      }
    };

    switch (evt.type) {
      case 'message.part.updated': {
        const part = evt.properties.part as Record<string, unknown>;
        const partType = part.type as string;

        if (partType === 'tool') {
          const state = part.state as Record<string, unknown>;
          const status = state.status as string;
          const toolName = part.tool as string;

          if (status === 'running') {
            setActivity('tool_running');
            detailedState.currentTool = toolName;
            detailedState.currentToolTitle = (state.title as string) || undefined;
            logger.debug(`[${agentId}] Tool running: ${toolName}`);
          } else if (status === 'completed') {
            setActivity('responding');
            detailedState.currentTool = undefined;
            detailedState.currentToolTitle = undefined;
          } else if (status === 'error') {
            detailedState.errorCount++;
            detailedState.lastError = state.error as string;
            logger.debug(`[${agentId}] Tool error: ${state.error}`);
          }
        } else if (partType === 'reasoning') {
          setActivity('thinking');
        } else if (partType === 'text') {
          setActivity('responding');
        } else if (partType === 'step-finish') {
          detailedState.stepsCompleted++;
          const tokens = part.tokens as { input: number; output: number; reasoning: number };
          if (tokens) {
            detailedState.tokens.input += tokens.input || 0;
            detailedState.tokens.output += tokens.output || 0;
            detailedState.tokens.reasoning += tokens.reasoning || 0;
          }
        } else if (partType === 'retry') {
          setActivity('retrying');
          detailedState.retryCount++;
          const error = part.error as Record<string, unknown>;
          if (error?.data) {
            detailedState.lastError = (error.data as Record<string, unknown>).message as string;
          }
        }
        return true;
      }

      case 'message.updated': {
        const info = evt.properties.info as Record<string, unknown>;
        if (info.role === 'assistant') {
          const tokens = info.tokens as { input: number; output: number; reasoning: number };
          const finish = info.finish as string | undefined;

          if (tokens) {
            // Keep the max value - message.updated fires multiple times, sometimes with 0
            detailedState.tokens.input = Math.max(detailedState.tokens.input, tokens.input || 0);
            detailedState.tokens.output = Math.max(detailedState.tokens.output, tokens.output || 0);
            detailedState.tokens.reasoning = Math.max(detailedState.tokens.reasoning, tokens.reasoning || 0);
          }
          if (finish) {
            detailedState.finishReason = finish;
          }
        }
        return true;
      }

      case 'permission.updated': {
        const props = evt.properties as {
          id: string;
          type: string;
          title: string;
          pattern?: string | string[];
          metadata: Record<string, unknown>;
          time: { created: number };
        };
        setActivity('waiting_permission');
        detailedState.pendingPermission = {
          id: props.id,
          type: props.type,
          title: props.title,
          pattern: props.pattern,
          metadata: props.metadata,
          createdAt: props.time.created,
        };
        logger.info(`[${agentId}] Permission required: ${props.title}`);
        return true;
      }

      case 'permission.replied': {
        detailedState.pendingPermission = undefined;
        setActivity('responding');
        return true;
      }

      case 'session.status': {
        const status = evt.properties.status as { type: string };
        if (status.type === 'idle') {
          setActivity('idle');
        } else if (status.type === 'busy') {
          if (detailedState.activity === 'initializing' || detailedState.activity === 'idle') {
            setActivity('responding');
          }
        } else if (status.type === 'retry') {
          setActivity('retrying');
        }
        return true;
      }

      case 'session.idle': {
        setActivity('idle');
        return true;
      }

      case 'session.error': {
        detailedState.errorCount++;
        const error = evt.properties.error as Record<string, unknown> | undefined;
        if (error?.data) {
          detailedState.lastError = (error.data as Record<string, unknown>).message as string;
        }
        return true;
      }

      case 'file.edited': {
        const file = evt.properties.file as string;
        if (!detailedState.filesModified.includes(file)) {
          detailedState.filesModified.push(file);
        }
        return true;
      }

      case 'session.diff': {
        const diffs = evt.properties.diff as Array<{
          additions: number;
          deletions: number;
          file: string;
        }>;
        let totalAdded = 0;
        let totalDeleted = 0;
        for (const diff of diffs) {
          totalAdded += diff.additions || 0;
          totalDeleted += diff.deletions || 0;
          if (!detailedState.filesModified.includes(diff.file)) {
            detailedState.filesModified.push(diff.file);
          }
        }
        detailedState.linesAdded = totalAdded;
        detailedState.linesDeleted = totalDeleted;
        return true;
      }

      case 'todo.updated': {
        const todos = evt.properties.todos as Array<{
          id: string;
          content: string;
          status: string;
          priority: string;
        }>;
        detailedState.todos = todos.map((t) => ({
          id: t.id,
          content: t.content,
          status: t.status,
          priority: t.priority,
        }));
        return true;
      }

      default:
        // Ignore other events
        return false;
    }
  }

  private async performHealthCheck(agentId: string): Promise<void> {
    const session = this.activeSessions.get(agentId);
    if (!session || !session.server) {
      return;
    }

    try {
      const response = await fetch(`${session.server.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      if (!response || !response.ok) {
        logger.warn(`[${agentId}] Health check failed - server may be unresponsive`);
      }
    } catch (error) {
      logger.debug(`[${agentId}] Health check error: ${error}`);
    }
  }

  private async cleanupSession(agentSession: AgentSession): Promise<void> {
    const { agentId, client, sessionId, server, timeoutId, healthCheckId } = agentSession;

    // Clear timers
    if (timeoutId) {
      clearTimeout(timeoutId);
      agentSession.timeoutId = null;
    }
    if (healthCheckId) {
      clearInterval(healthCheckId);
      agentSession.healthCheckId = null;
    }

    try {
      // Abort the session if it's still running
      if (client && sessionId) {
        try {
          await client.session.abort({ path: { id: sessionId } });
          logger.info(`[${agentId}] Aborted session ${sessionId}`);
        } catch (e) {
          // Session may already be finished, ignore errors
        }
      }

      // Close the server
      if (server) {
        try {
          server.close();
          logger.info(`[${agentId}] Server closed`);
        } catch (e) {
          // Ignore close errors
        }
      }
    } catch (error) {
      logger.warn(`[${agentId}] Cleanup error:`, error);
    }
  }

  private async forceKillSession(agentSession: AgentSession): Promise<void> {
    const { agentId, serverPort } = agentSession;

    // First try graceful cleanup
    await this.cleanupSession(agentSession);

    // Then force-kill by port if we have it
    if (serverPort) {
      try {
        logger.info(`[${agentId}] Force-killing processes on port ${serverPort}...`);
        await execAsync(`lsof -ti:${serverPort} | xargs kill -9 2>/dev/null || true`);
        logger.info(`[${agentId}] Force-killed processes on port ${serverPort}`);
      } catch (error) {
        logger.warn(`[${agentId}] Failed to force-kill by port: ${error}`);
      }
    }
  }

  async cancelSession(agentId: string): Promise<void> {
    const session = this.activeSessions.get(agentId);
    if (!session) {
      return;
    }

    try {
      logger.info(`[${agentId}] Cancelling session...`);

      // Signal cancellation via abort controller
      session.abortController?.abort();

      // Abort the SDK session
      if (session.client && session.sessionId) {
        await session.client.session.abort({ path: { id: session.sessionId } });
      }

      // Force cleanup
      await this.forceKillSession(session);

      logger.info(`Cancelled session for agent ${agentId}`);
    } catch (error) {
      logger.warn(`Error cancelling session for agent ${agentId}`, error);
    } finally {
      this.activeSessions.delete(agentId);
    }
  }

  async cancelAllSessions(exceptAgentId?: string): Promise<void> {
    const agentIds = Array.from(this.activeSessions.keys());
    for (const agentId of agentIds) {
      if (agentId !== exceptAgentId) {
        await this.cancelSession(agentId);
      }
    }
  }

  getSessionStatus(agentId: string): 'working' | 'success' | 'failed' | null {
    const session = this.activeSessions.get(agentId);
    return session?.status ?? null;
  }

  hasActiveSessions(): boolean {
    return this.activeSessions.size > 0;
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get the detailed state for an agent
   */
  getDetailedState(agentId: string): AgentDetailedState | null {
    const session = this.activeSessions.get(agentId);
    return session?.detailedState ?? null;
  }

  /**
   * Respond to a permission request for an agent
   */
  async respondToPermission(
    agentId: string,
    permissionId: string,
    response: 'once' | 'always' | 'reject'
  ): Promise<boolean> {
    const session = this.activeSessions.get(agentId);
    if (!session || !session.client || !session.sessionId) {
      logger.warn(`[${agentId}] Cannot respond to permission - no active session`);
      return false;
    }

    try {
      await session.client.postSessionIdPermissionsPermissionId({
        path: { id: session.sessionId, permissionID: permissionId },
        body: { response },
      });

      // Clear pending permission from state
      session.detailedState.pendingPermission = undefined;
      session.detailedState.activity = 'responding';

      logger.info(`[${agentId}] Responded to permission ${permissionId}: ${response}`);
      return true;
    } catch (error) {
      logger.error(`[${agentId}] Failed to respond to permission:`, error);
      return false;
    }
  }

  /**
   * Graceful shutdown - cancel all sessions and clean up resources
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('OpenCodeService shutting down...');

    const sessionCount = this.activeSessions.size;
    if (sessionCount > 0) {
      logger.info(`Cancelling ${sessionCount} active session(s)...`);

      const cancelPromises = Array.from(this.activeSessions.keys()).map((agentId) =>
        this.cancelSession(agentId).catch((e) => {
          logger.warn(`Error cancelling session ${agentId} during shutdown:`, e);
        })
      );

      await Promise.all(cancelPromises);
    }

    logger.info('OpenCodeService shutdown complete');
  }

  /**
   * Get health status of all active sessions
   */
  getHealthStatus(): {
    totalSessions: number;
    sessions: Array<{
      agentId: string;
      status: string;
      serverUrl: string | null;
      serverPort: number | null;
      uptimeSeconds: number;
    }>;
  } {
    const sessions = Array.from(this.activeSessions.values()).map((session) => ({
      agentId: session.agentId,
      status: session.status,
      serverUrl: session.server?.url ?? null,
      serverPort: session.serverPort,
      uptimeSeconds: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    }));

    return {
      totalSessions: sessions.length,
      sessions,
    };
  }
}

// Singleton instance
export const openCodeService = new OpenCodeService();
