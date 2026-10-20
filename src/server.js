require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize, testConnection, syncDatabase, User } = require('./models');
const { startScheduler, stopScheduler } = require('./services/pingEngine');
const seedDatabase = require('./seed/seeder');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 API Sentinel — Health Monitoring & Incident Platform');
    console.log('----------------------------------------------------');

    // 1. Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to establish database connection. Exiting...');
      process.exit(1);
    }

    // 2. Synchronize database schema
    await syncDatabase();

    // 3. Auto-seed if database is brand new (0 users)
    const userCount = await User.count().catch(() => 0);
    if (userCount === 0) {
      console.log('[Bootstrap] No users found. Executing automatic initial seed...');
      await seedDatabase();
    }

    // 4. Start HTTP Server
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`[Server] Sentinel Core is running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] Dialect: ${sequelize.getDialect().toUpperCase()}`);
      console.log('----------------------------------------------------');
    });

    // 5. Start background ping engine
    if (process.env.AUTO_PING_ENABLED !== 'false') {
      const interval = parseInt(process.env.PING_INTERVAL_MS || '30000', 10);
      startScheduler(interval);
    }

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
      stopScheduler();
      server.close(async () => {
        console.log('[Shutdown] Closed remaining HTTP connections.');
        await sequelize.close();
        console.log('[Shutdown] Database connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
};

startServer();
