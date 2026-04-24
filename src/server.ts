import app from './app';
import config from './config';
import pool from './config/database';

async function startServer(): Promise<void> {
  // Test database connection
  try {
    const connection = await pool.getConnection();
    console.log('[server] Database connection established successfully.');
    connection.release();
  } catch (error) {
    console.error('[server] Failed to connect to database:', error);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] Quintana Reyes API running on port ${config.port}`);
    console.log(`[server] Environment: ${config.nodeEnv}`);
    console.log(`[server] CORS origin: ${config.corsOrigin}`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      console.log('[server] HTTP server closed.');

      try {
        await pool.end();
        console.log('[server] Database pool closed.');
      } catch (error) {
        console.error('[server] Error closing database pool:', error);
      }

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
