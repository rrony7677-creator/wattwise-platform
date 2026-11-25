import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

// Only start HTTP listener when not running as a Vercel serverless function
if (!process.env.VERCEL) {
  void (async () => {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`⚡ WattWise API Server running on http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  })();
}

// Export Express app for Vercel Serverless Functions
export default app;
