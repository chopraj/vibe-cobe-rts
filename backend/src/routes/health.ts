import { Router } from 'express';
import { githubService } from '../services/GitHubService.js';
import { worktreeService } from '../services/WorktreeService.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      github: githubService.isConfigured(),
      worktree: worktreeService.isReady(),
    },
  });
});

export default router;
