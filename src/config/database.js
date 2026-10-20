const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dialect === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'apisentinel',
    process.env.DB_USER || 'sentinel',
    process.env.DB_PASSWORD || 'sentinel_secret',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[DB] ${msg}`) : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
} else {
  // SQLite mode
  const dbStoragePath = process.env.DB_STORAGE || './data/sentinel.sqlite';
  const resolvedPath = path.resolve(process.cwd(), dbStoragePath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: resolvedPath,
    logging: process.env.NODE_ENV === 'development' ? false : false, // reduce noise in console
  });
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[Database] Connected successfully via ${dialect.toUpperCase()}`);
    return true;
  } catch (error) {
    console.error(`[Database] Connection error:`, error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
