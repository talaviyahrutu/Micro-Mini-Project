const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Monitor = sequelize.define('Monitor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 120],
    },
  },
  url: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    validate: {
      isValidUrl(value) {
        try {
          const parsed = new URL(value);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('URL must use http: or https:');
          }
        } catch (e) {
          throw new Error('Must be a valid URL with http or https protocol');
        }
      },
    },
  },
  method: {
    type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'),
    defaultValue: 'GET',
    allowNull: false,
  },
  expectedStatusCode: {
    type: DataTypes.INTEGER,
    defaultValue: 200,
    allowNull: false,
  },
  intervalSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    validate: {
      min: 5,
      max: 3600,
    },
  },
  timeoutMs: {
    type: DataTypes.INTEGER,
    defaultValue: 5000,
    validate: {
      min: 500,
      max: 30000,
    },
  },
  environment: {
    type: DataTypes.ENUM('production', 'staging', 'development', 'internal'),
    defaultValue: 'production',
  },
  status: {
    type: DataTypes.ENUM('healthy', 'degraded', 'down', 'paused'),
    defaultValue: 'healthy',
  },
  lastCheckedAt: {
    type: DataTypes.DATE,
  },
  lastResponseTime: {
    type: DataTypes.INTEGER, // in ms
    defaultValue: 0,
  },
  lastStatusCode: {
    type: DataTypes.INTEGER,
  },
  uptimePercentage: {
    type: DataTypes.FLOAT,
    defaultValue: 100.0,
  },
  consecutiveFailures: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  headersJson: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const raw = this.getDataValue('headersJson');
      try {
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    },
    set(val) {
      this.setDataValue('headersJson', typeof val === 'object' ? JSON.stringify(val) : val || '{}');
    },
  },
  bodyPayload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Monitor;
