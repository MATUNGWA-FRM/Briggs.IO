import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { SERVER_CONFIG } from './src/server/config.ts';
import { getDb } from './src/server/database/db.ts';
import { ensureInitialMlData } from './src/server/ml/seedHistory.ts';
import { createApiRouter } from './src/server/routes/api.ts';

export async function createBriggApp() {
  getDb();
  ensureInitialMlData();

  const app = express();
  app.set('trust proxy', 1);

  // Security headers compatible with AI Studio iframe & Vite dev
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  app.use(express.json({ limit: '256kb' }));

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Slow down requests.' },
  });

  app.use('/api', apiLimiter, createApiRouter());

  if (!SERVER_CONFIG.isProd && process.env.NODE_ENV !== 'test') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV !== 'test') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createBriggApp().then((app) => {
    app.listen(SERVER_CONFIG.port, '0.0.0.0', () => {
      console.log(`Brigg.AI V1 server listening on http://0.0.0.0:${SERVER_CONFIG.port}`);
    });
  });
}
