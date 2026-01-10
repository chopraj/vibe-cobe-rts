import { logger } from '../utils/logger.js';
import { spawn, ChildProcess } from 'child_process';

export interface AgentSession {
  agentId: string;
  worktreePath: string;
  process: ChildProcess | null;
  status: 'working' | 'success' | 'failed';
}

export type AgentEventCallback = (
  agentId: string,
  event: 'working' | 'success' | 'failed',
  data?: unknown
) => void;

export class OpenCodeService {
  private activeSessions: Map<string, AgentSession> = new Map();

  async startSession(
    agentId: string,
    worktreePath: string,
    issueTitle: string,
    issueBody: string,
    onEvent: AgentEventCallback
  ): Promise<void> {
    logger.info(`Starting OpenCode session for agent ${agentId} in ${worktreePath}`);

    const agentSession: AgentSession = {
      agentId,
      worktreePath,
      process: null,
      status: 'working',
    };

    this.activeSessions.set(agentId, agentSession);

    try {
      // Build the prompt
      const prompt = `Solve this issue: ${issueTitle}\n\n${issueBody}`;

      // Spawn opencode CLI process
      // Using --yes to auto-approve all prompts and --print to output result
      const proc = spawn('npx', ['opencode-ai', '--yes', '--print', prompt], {
        cwd: worktreePath,
        shell: true,
        env: {
          ...process.env,
          // Disable interactive mode
          CI: 'true',
        },
      });

      agentSession.process = proc;

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
        logger.debug(`Agent ${agentId} stdout: ${data.toString()}`);
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug(`Agent ${agentId} stderr: ${data.toString()}`);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          agentSession.status = 'success';
          onEvent(agentId, 'success', { output });
          logger.info(`Agent ${agentId} completed successfully`);
        } else {
          agentSession.status = 'failed';
          onEvent(agentId, 'failed', { error: errorOutput || `Exit code: ${code}` });
          logger.error(`Agent ${agentId} failed with code ${code}`);
        }
        this.activeSessions.delete(agentId);
      });

      proc.on('error', (error) => {
        agentSession.status = 'failed';
        onEvent(agentId, 'failed', { error: error.message });
        logger.error(`Agent ${agentId} process error`, error);
        this.activeSessions.delete(agentId);
      });

    } catch (error) {
      logger.error(`Failed to start session for agent ${agentId}`, error);
      agentSession.status = 'failed';
      onEvent(agentId, 'failed', { error: String(error) });
      this.activeSessions.delete(agentId);
    }
  }

  async cancelSession(agentId: string): Promise<void> {
    const session = this.activeSessions.get(agentId);
    if (!session) {
      return;
    }

    try {
      if (session.process) {
        session.process.kill('SIGTERM');
      }
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
}

// Singleton instance
export const openCodeService = new OpenCodeService();
