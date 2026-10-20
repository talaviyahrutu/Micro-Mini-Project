const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Monitor, HealthCheck, Incident } = require('../models');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validate, monitorValidation } = require('../middleware/validator');
const { pingMonitor, runAllPings } = require('../services/pingEngine');

// List all monitors with search and filtering
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, status, environment, sortBy = 'createdAt', order = 'DESC' } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { url: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status && ['healthy', 'degraded', 'down', 'paused'].includes(status)) {
      where.status = status;
    }

    if (environment && ['production', 'staging', 'development', 'internal'].includes(environment)) {
      where.environment = environment;
    }

    const validSortFields = ['name', 'status', 'uptimePercentage', 'lastResponseTime', 'lastCheckedAt', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const monitors = await Monitor.findAll({
      where,
      order: [[sortField, sortOrder]],
    });

    // Compute summary metrics
    const totalCount = await Monitor.count();
    const healthyCount = await Monitor.count({ where: { status: 'healthy' } });
    const degradedCount = await Monitor.count({ where: { status: 'degraded' } });
    const downCount = await Monitor.count({ where: { status: 'down' } });

    return res.json({
      success: true,
      count: monitors.length,
      summary: {
        total: totalCount,
        healthy: healthyCount,
        degraded: degradedCount,
        down: downCount,
        overallUptime:
          totalCount > 0
            ? parseFloat((((healthyCount + degradedCount) / totalCount) * 100).toFixed(1))
            : 100,
      },
      data: monitors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single monitor with telemetry history and incidents
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const monitor = await Monitor.findByPk(req.params.id, {
      include: [
        {
          model: HealthCheck,
          as: 'healthChecks',
          limit: 30,
          order: [['checkedAt', 'DESC']],
        },
        {
          model: Incident,
          as: 'incidents',
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: `Monitor with ID ${req.params.id} not found.`,
      });
    }

    return res.json({
      success: true,
      data: monitor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create monitor (Admin / Analyst)
router.post('/', authenticateToken, requireRole('admin', 'analyst'), validate(monitorValidation), async (req, res) => {
  try {
    const {
      name,
      url,
      method = 'GET',
      expectedStatusCode = 200,
      intervalSeconds = 30,
      timeoutMs = 5000,
      environment = 'production',
      headersJson,
      bodyPayload,
      description,
    } = req.body;

    const monitor = await Monitor.create({
      name,
      url,
      method,
      expectedStatusCode,
      intervalSeconds,
      timeoutMs,
      environment,
      headersJson: headersJson || {},
      bodyPayload,
      description,
      status: 'healthy',
      uptimePercentage: 100.0,
    });

    // Trigger an initial ping immediately
    setTimeout(() => pingMonitor(monitor), 500);

    return res.status(201).json({
      success: true,
      message: 'Monitor created successfully.',
      data: monitor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update monitor (Admin)
router.put('/:id', authenticateToken, requireRole('admin'), validate(monitorValidation), async (req, res) => {
  try {
    const monitor = await Monitor.findByPk(req.params.id);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: `Monitor with ID ${req.params.id} not found.`,
      });
    }

    const {
      name,
      url,
      method,
      expectedStatusCode,
      intervalSeconds,
      timeoutMs,
      environment,
      headersJson,
      bodyPayload,
      description,
      isActive,
    } = req.body;

    await monitor.update({
      name: name ?? monitor.name,
      url: url ?? monitor.url,
      method: method ?? monitor.method,
      expectedStatusCode: expectedStatusCode ?? monitor.expectedStatusCode,
      intervalSeconds: intervalSeconds ?? monitor.intervalSeconds,
      timeoutMs: timeoutMs ?? monitor.timeoutMs,
      environment: environment ?? monitor.environment,
      headersJson: headersJson !== undefined ? headersJson : monitor.headersJson,
      bodyPayload: bodyPayload !== undefined ? bodyPayload : monitor.bodyPayload,
      description: description ?? monitor.description,
      isActive: isActive !== undefined ? isActive : monitor.isActive,
    });

    return res.json({
      success: true,
      message: 'Monitor updated successfully.',
      data: monitor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete monitor (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const monitor = await Monitor.findByPk(req.params.id);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: `Monitor with ID ${req.params.id} not found.`,
      });
    }

    await monitor.destroy();

    return res.json({
      success: true,
      message: `Monitor '${monitor.name}' deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Trigger immediate manual health check ping on specific monitor
router.post('/:id/ping', authenticateToken, async (req, res) => {
  try {
    const monitor = await Monitor.findByPk(req.params.id);
    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: `Monitor with ID ${req.params.id} not found.`,
      });
    }

    const result = await pingMonitor(monitor);

    return res.json({
      success: true,
      message: `Health check executed for ${monitor.name}.`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Trigger ping on all monitors
router.post('/ping-all', authenticateToken, async (req, res) => {
  try {
    runAllPings(); // runs in background
    return res.json({
      success: true,
      message: 'Manual health check cycle triggered for all active monitors.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
