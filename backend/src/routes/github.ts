import { Router } from 'express';
import { githubService } from '../services/GitHubService.js';
import { worktreeService } from '../services/WorktreeService.js';
import { ConfigSchema, parseRepoUrl } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/config - Set repo URL + PAT
router.post('/config', async (req, res) => {
  try {
    const input = ConfigSchema.parse(req.body);

    const parsed = parseRepoUrl(input.repoUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Invalid GitHub repository URL' });
      return;
    }

    const config = {
      repoUrl: input.repoUrl,
      pat: input.pat,
      owner: parsed.owner,
      repo: parsed.repo,
      unitCount: input.unitCount,
    };

    // Configure GitHub service
    githubService.configure(config);

    // Initialize worktree service with clone URL
    await worktreeService.initialize(githubService.getCloneUrl());

    logger.info('Configuration set successfully');
    res.json({
      success: true,
      owner: config.owner,
      repo: config.repo,
      unitCount: config.unitCount,
    });
  } catch (error) {
    logger.error('Failed to set configuration', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid configuration',
    });
  }
});

// GET /api/config - Get current config (without PAT)
router.get('/config', (req, res) => {
  const config = githubService.getConfig();
  if (!config) {
    res.status(404).json({ error: 'Not configured' });
    return;
  }

  res.json({
    owner: config.owner,
    repo: config.repo,
    unitCount: config.unitCount,
    configured: true,
  });
});

// GET /api/issues - Fetch open issues from repo
router.get('/issues', async (req, res) => {
  if (!githubService.isConfigured()) {
    res.status(400).json({ error: 'GitHub not configured. Call POST /api/config first.' });
    return;
  }

  try {
    const issues = await githubService.fetchIssues();
    res.json(issues);
  } catch (error) {
    logger.error('Failed to fetch issues', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch issues',
    });
  }
});

export default router;
