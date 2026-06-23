import express from 'express';
import cors from 'cors';
import libraryRouter from './routes/library';
import itemRouter from './routes/item';
import streamRouter from './routes/stream';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(libraryRouter);
  app.use(itemRouter);
  app.use(streamRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
