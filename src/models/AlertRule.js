const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AlertRule = sequelize.define('AlertRule', {
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
    },
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Monitors',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  conditionType: {
    type: DataTypes.ENUM('consecutive_failures', 'latency_threshold', 'status_code_mismatch'),
    defaultValue: 'consecutive_failures',
    allowNull: false,
  },
  thresholdValue: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    allowNull: false,
  },
  channel: {
    type: DataTypes.ENUM('email', 'slack', 'webhook', 'incident'),
    defaultValue: 'incident',
    allowNull: false,
  },
  targetRecipient: {
    type: DataTypes.STRING(255),
    defaultValue: 'alerts@apisentinel.dev',
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = AlertRule;
