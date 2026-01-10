import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.js';
import githubRoutes from './routes/github.js';
import battlesRoutes from './routes/battles.js';
import { logger } from './utils/logger.js';

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
app.listen(PORT, () => {
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
