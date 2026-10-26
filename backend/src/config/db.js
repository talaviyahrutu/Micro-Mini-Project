const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connect to MongoDB with automatic fallback to embedded in-memory MongoDB
 * for instant zero-configuration local runs and evaluation.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apisentinel';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] ✅ Connected to MongoDB successfully (${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name})`);
  } catch (primaryError) {
    console.warn(`[Database] ⚠️ Could not connect to primary MongoDB (${primaryError.message}).`);
    
    // In local development or testing, fall back to embedded MongoMemoryServer if external Mongo is offline
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log(`[Database] 🚀 Initializing embedded In-Memory MongoDB Server for local execution...`);
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        await mongoose.connect(memUri);
        console.log(`[Database] ✅ Connected to In-Memory MongoDB at: ${memUri}`);
        return;
      } catch (memError) {
        console.error(`[Database] ❌ Failed to start In-Memory MongoDB:`, memError.message);
      }
    }

    throw primaryError;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log(`[Database] Disconnected from MongoDB.`);
  } catch (err) {
    console.error(`[Database] Error disconnecting:`, err.message);
  }
};

module.exports = { connectDB, disconnectDB };
