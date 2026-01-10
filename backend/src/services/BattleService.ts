import { nanoid } from 'nanoid';
import type { Battle, AgentInstance, GitHubIssue } from '../types/index.js';
import { githubService } from './GitHubService.js';
import { worktreeService } from './WorktreeService.js';
import { openCodeService } from './OpenCodeService.js';
import { logger } from '../utils/logger.js';

const MAX_CONCURRENT_BATTLES = 3;

export class BattleService {
  private battles: Map<string, Battle> = new Map();

  getBattles(): Battle[] {
    return Array.from(this.battles.values());
  }

  getBattle(battleId: string): Battle | null {
    return this.battles.get(battleId) ?? null;
  }

  getActiveBattleCount(): number {
    return Array.from(this.battles.values()).filter(
      (b) => b.status === 'pending' || b.status === 'fighting'
    ).length;
  }

  async startBattle(issue: GitHubIssue): Promise<Battle> {
    // Check concurrent battle limit
    if (this.getActiveBattleCount() >= MAX_CONCURRENT_BATTLES) {
      throw new Error(`Maximum concurrent battles (${MAX_CONCURRENT_BATTLES}) reached`);
    }

    const config = githubService.getConfig();
    if (!config) {
      throw new Error('GitHub not configured');
    }

    const battleId = nanoid(10);
    const unitCount = config.unitCount;

    // Create the battle
    const battle: Battle = {
      id: battleId,
      issueId: issue.id,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueBody: issue.body,
      status: 'pending',
      agents: [],
      startedAt: new Date(),
    };

    this.battles.set(battleId, battle);

    logger.info(`Starting battle ${battleId} for issue #${issue.number}`);

    try {
      // Create worktrees for all agents
      const worktreePaths = await worktreeService.createWorktreesForBattle(
        battleId,
        issue.number,
        unitCount
      );

      // Create agent instances
      const agents: AgentInstance[] = worktreePaths.map((path, index) => ({
        id: `${battleId}-agent-${index}`,
        unitIndex: index,
        status: 'pending',
        worktreePath: path,
        sessionId: null,
      }));

      battle.agents = agents;
      battle.status = 'fighting';

      // Start all OpenCode sessions in parallel
      for (const agent of agents) {
        this.startAgentSession(battle, agent);
      }

      return battle;
    } catch (error) {
      logger.error(`Failed to start battle ${battleId}`, error);
      battle.status = 'defeat';
      battle.completedAt = new Date();
      throw error;
    }
  }

  private async startAgentSession(battle: Battle, agent: AgentInstance): Promise<void> {
    agent.status = 'working';

    await openCodeService.startSession(
      agent.id,
      agent.worktreePath,
      battle.issueTitle,
      battle.issueBody,
      async (agentId, event, data) => {
        this.handleAgentEvent(battle.id, agentId, event, data);
      }
    );
  }

  private async handleAgentEvent(
    battleId: string,
    agentId: string,
    event: 'working' | 'success' | 'failed',
    data?: unknown
  ): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle) return;

    const agent = battle.agents.find((a) => a.id === agentId);
    if (!agent) return;

    logger.info(`Battle ${battleId} agent ${agentId} event: ${event}`);

    if (event === 'success') {
      // Check if battle is still active (another agent might have won first)
      if (battle.status !== 'fighting') {
        return;
      }

      agent.status = 'success';
      await this.handleAgentSuccess(battle, agent);
    } else if (event === 'failed') {
      agent.status = 'failed';
      agent.error = data ? String(data) : 'Unknown error';

      // Check if all agents have failed
      const allFailed = battle.agents.every(
        (a) => a.status === 'failed' || a.status === 'cancelled'
      );

      if (allFailed) {
        await this.handleBattleDefeat(battle);
      }
    }
  }

  private async handleAgentSuccess(battle: Battle, winningAgent: AgentInstance): Promise<void> {
    logger.info(`Agent ${winningAgent.id} succeeded! Creating PR...`);

    try {
      // Commit and push the changes
      const branchName = await worktreeService.commitAndPush(
        winningAgent.worktreePath,
        battle.issueNumber
      );

      // Create PR
      const prUrl = await githubService.createPullRequest(
        branchName,
        battle.issueNumber,
        battle.issueTitle
      );

      // Update battle state
      battle.status = 'victory';
      battle.completedAt = new Date();
      battle.prUrl = prUrl;
      battle.winningAgentId = winningAgent.id;

      // Cancel all other agents
      for (const agent of battle.agents) {
        if (agent.id !== winningAgent.id && agent.status === 'working') {
          agent.status = 'cancelled';
          await openCodeService.cancelSession(agent.id);
        }
      }

      // Cleanup worktrees (keep the battle in memory for UI)
      await worktreeService.cleanupBattle(battle.id);

      logger.info(`Battle ${battle.id} victory! PR: ${prUrl}`);
    } catch (error) {
      logger.error(`Failed to handle agent success for battle ${battle.id}`, error);
      // Mark as defeat if we can't create the PR
      await this.handleBattleDefeat(battle);
    }
  }

  private async handleBattleDefeat(battle: Battle): Promise<void> {
    battle.status = 'defeat';
    battle.completedAt = new Date();

    // Cancel any remaining sessions
    for (const agent of battle.agents) {
      if (agent.status === 'working') {
        agent.status = 'cancelled';
        await openCodeService.cancelSession(agent.id);
      }
    }

    // Cleanup worktrees
    await worktreeService.cleanupBattle(battle.id);

    logger.info(`Battle ${battle.id} defeat - all agents failed`);
  }

  async cancelBattle(battleId: string): Promise<void> {
    const battle = this.battles.get(battleId);
    if (!battle || battle.status !== 'fighting') {
      return;
    }

    logger.info(`Cancelling battle ${battleId}`);

    battle.status = 'defeat';
    battle.completedAt = new Date();

    // Cancel all agent sessions
    for (const agent of battle.agents) {
      if (agent.status === 'working' || agent.status === 'pending') {
        agent.status = 'cancelled';
        await openCodeService.cancelSession(agent.id);
      }
    }

    // Cleanup worktrees
    await worktreeService.cleanupBattle(battleId);
  }

  removeBattle(battleId: string): void {
    this.battles.delete(battleId);
  }
}

// Singleton instance
export const battleService = new BattleService();
