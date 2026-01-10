import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import githubRoutes from './routes/github.js';
import battlesRoutes from './routes/battles.js';
import { logger } from './utils/logger.js';
import { openCodeService } from './services/OpenCodeService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api', githubRoutes);
app.use('/api/battles', battlesRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info('Endpoints:');
  logger.info('  GET  /api/health       - Health check');
  logger.info('  POST /api/config       - Set repo URL + PAT');
  logger.info('  GET  /api/config       - Get current config');
  logger.info('  GET  /api/issues       - Fetch open issues');
  logger.info('  GET  /api/battles      - List all battles');
  logger.info('  POST /api/battles      - Start new battle');
  logger.info('  GET  /api/battles/:id  - Get battle status');
  logger.info('  DELETE /api/battles/:id - Cancel battle');
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown OpenCode service (kills all agent sessions)
  try {
    await openCodeService.shutdown();
  } catch (error) {
    logger.error('Error during OpenCodeService shutdown:', error);
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions - try to cleanup before crashing
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', error);
  try {
    await openCodeService.shutdown();
  } catch (e) {
    logger.error('Error during emergency shutdown:', e);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
