// Agent status within a battle
export type AgentStatus = 'pending' | 'working' | 'success' | 'failed' | 'cancelled';

// Battle status
export type BattleStatus = 'pending' | 'fighting' | 'victory' | 'defeat';

// Each unit = one OpenCode agent instance
export interface AgentInstance {
  id: string;
  unitIndex: number;
  status: AgentStatus;
  worktreePath: string;
  sessionId: string | null;
  error?: string;
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
