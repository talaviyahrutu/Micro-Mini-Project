require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { initScheduler, stopAll } = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start HTTP Server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🛡️  API Sentinel Backend Engine Running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health probe: http://localhost:${PORT}/healthz`);
      console.log(`   REST Base:   http://localhost:${PORT}/api`);
      console.log(`=======================================================`);
    });

    // 3. Initialize background health-check scheduler
    await initScheduler();

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[System] Received ${signal}. Gracefully shutting down...`);
      stopAll();
      server.close(async () => {
        console.log('[System] HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });

      // Force exit if not cleanly shut down within 8 seconds
      setTimeout(() => {
        console.error('[System] Forced exit due to timeout.');
        process.exit(1);
      }, 8000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(`[System] Fatal startup error:`, error.message);
    process.exit(1);
  }
}

startServer();
