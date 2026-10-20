const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const Monitor = require('./Monitor');
const HealthCheck = require('./HealthCheck');
const Incident = require('./Incident');
const AlertRule = require('./AlertRule');

// Associations
Monitor.hasMany(HealthCheck, { foreignKey: 'monitorId', as: 'healthChecks', onDelete: 'CASCADE' });
HealthCheck.belongsTo(Monitor, { foreignKey: 'monitorId', as: 'monitor' });

Monitor.hasMany(Incident, { foreignKey: 'monitorId', as: 'incidents', onDelete: 'SET NULL' });
Incident.belongsTo(Monitor, { foreignKey: 'monitorId', as: 'monitor' });

User.hasMany(Incident, { foreignKey: 'assignedToId', as: 'assignedIncidents', onDelete: 'SET NULL' });
Incident.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' });

Monitor.hasMany(AlertRule, { foreignKey: 'monitorId', as: 'alertRules', onDelete: 'CASCADE' });
AlertRule.belongsTo(Monitor, { foreignKey: 'monitorId', as: 'monitor' });

const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ alter: !force, force });
    console.log(`[Database] All models synchronized successfully.`);
  } catch (error) {
    console.error(`[Database] Synchronization error:`, error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  User,
  Monitor,
  HealthCheck,
  Incident,
  AlertRule,
};
