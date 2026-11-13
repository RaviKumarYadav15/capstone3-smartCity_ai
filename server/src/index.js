import tls from 'node:tls';
try {
  tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
  tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
} catch {}

import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

await connectDb();
const server = createApp().listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
