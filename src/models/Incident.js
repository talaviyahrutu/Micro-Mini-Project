const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  incidentCode: {
    type: DataTypes.STRING(30),
    unique: true,
  },
  monitorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Monitors',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  severity: {
    type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
    defaultValue: 'high',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('investigating', 'identified', 'monitoring', 'resolved'),
    defaultValue: 'investigating',
    allowNull: false,
  },
  triggeredBy: {
    type: DataTypes.ENUM('automatic', 'manual'),
    defaultValue: 'automatic',
  },
  rootCause: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resolutionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  acknowledgedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  timelineJson: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('timelineJson');
      try {
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('timelineJson', typeof val === 'object' ? JSON.stringify(val) : val || '[]');
    },
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (incident) => {
      if (!incident.incidentCode) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        incident.incidentCode = `INC-${Date.now().toString().slice(-4)}${rand}`;
      }
      if (!incident.timelineJson || incident.timelineJson.length === 0) {
        incident.timelineJson = [
          {
            timestamp: new Date().toISOString(),
            action: 'CREATED',
            note: incident.description || 'Incident created',
            author: incident.triggeredBy === 'automatic' ? 'System Sentinel' : 'User',
          },
        ];
      }
    },
  },
});

module.exports = Incident;
