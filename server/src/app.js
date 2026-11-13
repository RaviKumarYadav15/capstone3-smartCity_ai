import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { loadUser, sameOrigin } from './middleware/auth.js';
import { apiLimiter } from './middleware/limits.js';
import { notFound, errorHandler } from './middleware/error.js';
import { HttpError } from './utils/HttpError.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import tenderRoutes from './routes/tenders.js';
import disputeRoutes from './routes/disputes.js';
import statsRoutes from './routes/stats.js';

export function createApp() {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const cleanClientOrigin = (env.clientOrigin || '').replace(/\/$/, '');
  const allowedOrigins = new Set([
    cleanClientOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '');
      if (allowedOrigins.has(clean) || (!env.isProd && clean.startsWith('http://localhost:'))) {
        return callback(null, true);
      }
      return callback(new HttpError(403, 'CORS: Request origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  }));

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Leaflet and React set inline styles
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', '*'],
        connectSrc: ["'self'", '*'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // let your TLS terminator / HSTS handle HTTPS
      },
    },
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter, sameOrigin, loadUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/tenders', tenderRoutes);
  app.use('/api/disputes', disputeRoutes);
  app.use('/api', statsRoutes);
  app.use('/api', notFound);

  // production: serve the built React app, with SPA fallback
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
