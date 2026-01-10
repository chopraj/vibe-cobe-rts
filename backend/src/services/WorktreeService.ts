import { simpleGit, SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const WORKTREES_DIR = path.join(process.cwd(), 'worktrees');
const MAIN_REPO_DIR = path.join(WORKTREES_DIR, 'main-repo');

export class WorktreeService {
  private mainGit: SimpleGit | null = null;
  private isInitialized = false;

  async initialize(cloneUrl: string): Promise<void> {
    try {
      // Create worktrees directory if it doesn't exist
      await fs.mkdir(WORKTREES_DIR, { recursive: true });

      // Check if main repo already exists
      try {
        await fs.access(path.join(MAIN_REPO_DIR, '.git'));
        logger.info('Main repo already exists, pulling latest changes');
        this.mainGit = simpleGit(MAIN_REPO_DIR);
        await this.mainGit.fetch('origin');
      } catch {
        // Clone the repo
        logger.info('Cloning repository...');
        await simpleGit().clone(cloneUrl, MAIN_REPO_DIR);
        this.mainGit = simpleGit(MAIN_REPO_DIR);
      }

      this.isInitialized = true;
      logger.info('WorktreeService initialized');
    } catch (error) {
      logger.error('Failed to initialize WorktreeService', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.mainGit !== null;
  }

  async createWorktreesForBattle(
    battleId: string,
    issueNumber: number,
    unitCount: number
  ): Promise<string[]> {
    if (!this.mainGit) {
      throw new Error('WorktreeService not initialized');
    }

    const battleDir = path.join(WORKTREES_DIR, `battle-${battleId}`);
    await fs.mkdir(battleDir, { recursive: true });

    const worktreePaths: string[] = [];

    // Get the default branch name
    const branches = await this.mainGit.branch();
    const defaultBranch = branches.current || 'main';

    // Make sure we're up to date
    try {
      await this.mainGit.pull('origin', defaultBranch);
    } catch (error) {
      logger.warn('Could not pull latest changes', error);
    }

    for (let i = 0; i < unitCount; i++) {
      const agentDir = path.join(battleDir, `agent-${i}`);
      const branchName = `fix/issue-${issueNumber}-attempt-${battleId}-${i}`;

      try {
        // Create worktree with a new branch
        await this.mainGit.raw([
          'worktree',
          'add',
          '-b',
          branchName,
          agentDir,
          defaultBranch,
        ]);

        worktreePaths.push(agentDir);
        logger.info(`Created worktree for agent ${i} at ${agentDir}`);
      } catch (error) {
        logger.error(`Failed to create worktree for agent ${i}`, error);
        throw error;
      }
    }

    return worktreePaths;
  }

  async commitAndPush(worktreePath: string, issueNumber: number): Promise<string> {
    const git = simpleGit(worktreePath);

    try {
      // Get current branch name
      const branches = await git.branch();
      const branchName = branches.current;

      // Stage all changes
      await git.add('.');

      // Check if there are changes to commit
      const status = await git.status();
      if (status.files.length === 0) {
        throw new Error('No changes to commit');
      }

      // Commit
      await git.commit(`Fix issue #${issueNumber}\n\nAutomatically generated fix by RTS Issue Battle game.`);

      // Push
      await git.push('origin', branchName, ['--set-upstream']);

      logger.info(`Pushed branch ${branchName}`);
      return branchName;
    } catch (error) {
      logger.error('Failed to commit and push', error);
      throw error;
    }
  }

  async cleanupBattle(battleId: string): Promise<void> {
    if (!this.mainGit) {
      return;
    }

    const battleDir = path.join(WORKTREES_DIR, `battle-${battleId}`);

    try {
      // List all worktrees
      const worktreeList = await this.mainGit.raw(['worktree', 'list', '--porcelain']);
      const worktreePaths = worktreeList
        .split('\n')
        .filter((line) => line.startsWith('worktree '))
        .map((line) => line.replace('worktree ', ''));

      // Remove worktrees in this battle directory
      for (const wtPath of worktreePaths) {
        if (wtPath.includes(`battle-${battleId}`)) {
          try {
            await this.mainGit.raw(['worktree', 'remove', '--force', wtPath]);
            logger.info(`Removed worktree ${wtPath}`);
          } catch (error) {
            logger.warn(`Could not remove worktree ${wtPath}`, error);
          }
        }
      }

      // Clean up the battle directory
      await fs.rm(battleDir, { recursive: true, force: true });
      logger.info(`Cleaned up battle ${battleId}`);
    } catch (error) {
      logger.error(`Failed to cleanup battle ${battleId}`, error);
    }
  }

  async cleanupAllWorktrees(): Promise<void> {
    if (!this.mainGit) {
      return;
    }

    try {
      // Prune all worktrees
      await this.mainGit.raw(['worktree', 'prune']);

      // Remove battle directories
      const entries = await fs.readdir(WORKTREES_DIR);
      for (const entry of entries) {
        if (entry.startsWith('battle-')) {
          const battleDir = path.join(WORKTREES_DIR, entry);
          await fs.rm(battleDir, { recursive: true, force: true });
        }
      }

      logger.info('Cleaned up all worktrees');
    } catch (error) {
      logger.error('Failed to cleanup all worktrees', error);
    }
  }
}

// Singleton instance
export const worktreeService = new WorktreeService();
