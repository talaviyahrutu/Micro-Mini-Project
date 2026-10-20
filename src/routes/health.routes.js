const express = require('express');
const router = express.Router();
const { HealthCheck, Monitor, sequelize } = require('../models');
const { optionalAuth } = require('../middleware/auth');

// Telemetry stream logs with pagination and filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { monitorId, status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (monitorId) where.monitorId = monitorId;
    if (status && ['healthy', 'degraded', 'down'].includes(status)) where.status = status;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const { count, rows } = await HealthCheck.findAndCountAll({
      where,
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['checkedAt', 'DESC']],
      include: [
        {
          model: Monitor,
          as: 'monitor',
          attributes: ['id', 'name', 'url', 'method', 'environment'],
        },
      ],
    });

    return res.json({
      success: true,
      total: count,
      limit: parsedLimit,
      offset: parsedOffset,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Overall telemetry statistics & latency distribution
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const totalChecks = await HealthCheck.count();
    const successfulChecks = await HealthCheck.count({ where: { isSuccess: true } });
    const failedChecks = totalChecks - successfulChecks;

    // Average response time
    const avgLatencyResult = await HealthCheck.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgLatency']],
    });
    const avgLatency = Math.round(avgLatencyResult?.getDataValue('avgLatency') || 0);

    // Recent 20 check points for sparklines
    const recentChecks = await HealthCheck.findAll({
      limit: 20,
      order: [['checkedAt', 'DESC']],
      attributes: ['id', 'responseTimeMs', 'status', 'checkedAt', 'monitorId'],
    });

    return res.json({
      success: true,
      data: {
        totalChecks,
        successfulChecks,
        failedChecks,
        avgLatencyMs: avgLatency,
        uptimePercentage:
          totalChecks > 0 ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100.0,
        recentChecks: recentChecks.reverse(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Platform self-diagnostic endpoint
router.get('/system', async (req, res) => {
  try {
    let dbStatus = 'CONNECTED';
    try {
      await sequelize.authenticate();
    } catch (e) {
      dbStatus = 'DISCONNECTED: ' + e.message;
    }

    const memory = process.memoryUsage();

    return res.json({
      service: 'API Sentinel Monitoring Engine',
      version: '1.0.0',
      status: 'OPERATIONAL',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        dialect: sequelize.getDialect(),
        status: dbStatus,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMb: {
          rss: Math.round(memory.rss / (1024 * 1024)),
          heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
          heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      service: 'API Sentinel',
      status: 'DEGRADED',
      error: error.message,
    });
  }
});

module.exports = router;
