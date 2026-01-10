import { Router } from 'express';
import { battleService } from '../services/BattleService.js';
import { githubService } from '../services/GitHubService.js';
import { StartBattleSchema } from '../types/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/battles - List all battles
router.get('/', (req, res) => {
  const battles = battleService.getBattles();
  res.json(battles);
});

// GET /api/battles/:id - Get single battle
router.get('/:id', (req, res) => {
  const battle = battleService.getBattle(req.params.id);
  if (!battle) {
    res.status(404).json({ error: 'Battle not found' });
    return;
  }
  res.json(battle);
});

// POST /api/battles - Start new battle
router.post('/', async (req, res) => {
  if (!githubService.isConfigured()) {
    res.status(400).json({ error: 'GitHub not configured. Call POST /api/config first.' });
    return;
  }

  try {
    const input = StartBattleSchema.parse(req.body);

    // Fetch the issue details
    const issue = await githubService.getIssue(input.issueNumber);
    if (!issue) {
      res.status(404).json({ error: `Issue #${input.issueNumber} not found` });
      return;
    }

    // Start the battle
    const battle = await battleService.startBattle(issue);
    res.status(201).json(battle);
  } catch (error) {
    logger.error('Failed to start battle', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to start battle',
    });
  }
});

// DELETE /api/battles/:id - Cancel battle
router.delete('/:id', async (req, res) => {
  const battle = battleService.getBattle(req.params.id);
  if (!battle) {
    res.status(404).json({ error: 'Battle not found' });
    return;
  }

  try {
    await battleService.cancelBattle(req.params.id);
    res.json({ success: true, message: 'Battle cancelled' });
  } catch (error) {
    logger.error('Failed to cancel battle', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel battle',
    });
  }
});

// DELETE /api/battles/:id/remove - Remove completed battle from list
router.delete('/:id/remove', (req, res) => {
  const battle = battleService.getBattle(req.params.id);
  if (!battle) {
    res.status(404).json({ error: 'Battle not found' });
    return;
  }

  if (battle.status === 'pending' || battle.status === 'fighting') {
    res.status(400).json({ error: 'Cannot remove active battle. Cancel it first.' });
    return;
  }

  battleService.removeBattle(req.params.id);
  res.json({ success: true, message: 'Battle removed' });
});

export default router;
