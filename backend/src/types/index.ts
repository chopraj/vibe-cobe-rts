import { z } from "zod";

// Agent status within a battle
export type AgentStatus =
  | "pending"
  | "working"
  | "success"
  | "failed"
  | "cancelled";

// Detailed activity state for real-time tracking
export type AgentActivity =
  | "initializing"
  | "thinking"
  | "tool_running"
  | "responding"
  | "waiting_permission"
  | "retrying"
  | "idle"
  | "completed";

// Permission request that needs human input
export interface PendingPermission {
  id: string;
  type: string;
  title: string;
  pattern?: string | string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

// Todo item from agent
export interface AgentTodo {
  id: string;
  content: string;
  status: string;
  priority: string;
}

// Detailed state for real-time tracking
export interface AgentDetailedState {
  // Current activity
  activity: AgentActivity;

  // Tool execution (when activity === 'tool_running')
  currentTool?: string;
  currentToolTitle?: string;

  // Token consumption
  tokens: {
    input: number;
    output: number;
    reasoning: number;
  };

  // Progress tracking
  todos: AgentTodo[];
  stepsCompleted: number;

  // File activity
  filesModified: string[];
  linesAdded: number;
  linesDeleted: number;

  // Health/errors
  errorCount: number;
  retryCount: number;
  lastError?: string;

  // Permission blocking
  pendingPermission?: PendingPermission;

  // Completion
  isFinished: boolean;
  finishReason?: string;
  completedAt?: number;
}

// Battle status
export type BattleStatus = "pending" | "fighting" | "victory" | "defeat";

// Each unit = one OpenCode agent instance
export interface AgentInstance {
  id: string;
  unitIndex: number;
  status: AgentStatus;
  worktreePath: string;
  sessionId: string | null;
  error?: string;
  // Real-time detailed state
  detailedState?: AgentDetailedState;
}

// A "Battle" is a swarm attack on one issue with multiple agents
export interface Battle {
  id: string;
  issueId: number;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  status: BattleStatus;
  agents: AgentInstance[];
  startedAt: Date;
  completedAt?: Date;
  prUrl?: string;
  winningAgentId?: string;
}

// GitHub issue
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: "open" | "closed";
  url: string;
}

// Game configuration
export interface GameConfig {
  repoUrl: string;
  pat: string;
  owner: string;
  repo: string;
  unitCount: number;
}

// Zod schemas for validation
export const ConfigSchema = z.object({
  repoUrl: z.string().url(),
  pat: z.string().min(1),
  unitCount: z.number().int().min(1).max(20).optional().default(10),
});

export const StartBattleSchema = z.object({
  issueNumber: z.number().int().positive(),
  unitCount: z.number().int().min(1).max(20),
});

export type ConfigInput = z.infer<typeof ConfigSchema>;
export type StartBattleInput = z.infer<typeof StartBattleSchema>;

// Parse GitHub repo URL to extract owner and repo
export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  // Support formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo.github.io
  // git@github.com:owner/repo.git
  const httpsMatch = url.match(
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/
  );
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = url.match(/github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}
