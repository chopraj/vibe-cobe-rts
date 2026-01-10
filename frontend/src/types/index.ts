// Agent status within a battle
export type AgentStatus = 'pending' | 'working' | 'success' | 'failed' | 'cancelled';

// Battle status
export type BattleStatus = 'pending' | 'fighting' | 'victory' | 'defeat';

// Detailed activity state for real-time tracking
export type AgentActivity =
  | 'initializing'
  | 'thinking'
  | 'tool_running'
  | 'responding'
  | 'waiting_permission'
  | 'retrying'
  | 'idle'
  | 'completed';

export interface PendingPermission {
  id: string;
  type: string;
  title: string;
  pattern?: string | string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface AgentTodo {
  id: string;
  content: string;
  status: string;
  priority: string;
}

export interface AgentDetailedState {
  activity: AgentActivity;
  currentTool?: string;
  currentToolTitle?: string;
  tokens: { input: number; output: number; reasoning: number };
  todos: AgentTodo[];
  stepsCompleted: number;
  filesModified: string[];
  linesAdded: number;
  linesDeleted: number;
  errorCount: number;
  retryCount: number;
  lastError?: string;
  pendingPermission?: PendingPermission;
  isFinished: boolean;
  finishReason?: string;
  completedAt?: number;
}

// Each unit = one OpenCode agent instance
export interface AgentInstance {
  id: string;
  unitIndex: number;
  status: AgentStatus;
  worktreePath: string;
  sessionId: string | null;
  error?: string;
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
  startedAt: string;
  completedAt?: string;
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
  state: 'open' | 'closed';
  url: string;
}

// Game configuration
export interface GameConfig {
  owner: string;
  repo: string;
  unitCount: number;
  configured: boolean;
}

// API response types
export interface ConfigResponse {
  success: boolean;
  owner: string;
  repo: string;
  unitCount: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    github: boolean;
    worktree: boolean;
  };
}
