import tls from 'node:tls';
try {
  tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
  tls.DEFAULT_MAX_VERSION = 'TLSv1.2';
} catch {}

try {
  const { env } = await import('./config/env.js');
  const { connectDb } = await import('./config/db.js');
  const { createApp } = await import('./app.js');

  console.log('Initiating database connection...');
  await connectDb();
  console.log('Database connected successfully.');

  const port = env.port || 5000;
  const server = createApp().listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (0.0.0.0)`);
  });

  const shutdown = () => {
    console.log('Received termination signal, closing server...');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error('Fatal initialization error on server startup:', err);
  process.exit(1);
}
