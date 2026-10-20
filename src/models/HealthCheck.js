const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HealthCheck = sequelize.define('HealthCheck', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Monitors',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  status: {
    type: DataTypes.ENUM('healthy', 'degraded', 'down'),
    allowNull: false,
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isSuccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  checkedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
  indexes: [
    { fields: ['monitorId'] },
    { fields: ['checkedAt'] },
    { fields: ['status'] },
  ],
});

module.exports = HealthCheck;
