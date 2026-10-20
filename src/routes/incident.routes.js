const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Incident, Monitor, User } = require('../models');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validate, incidentValidation } = require('../middleware/validator');

// List incidents with filtering & search
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, severity, monitorId, search, isOpen } = req.query;

    const where = {};

    if (isOpen === 'true') {
      where.status = { [Op.ne]: 'resolved' };
    } else if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (monitorId) {
      where.monitorId = monitorId;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { incidentCode: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const incidents = await Incident.findAll({
      where,
      include: [
        { model: Monitor, as: 'monitor', attributes: ['id', 'name', 'url', 'status', 'environment'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const activeCount = await Incident.count({
      where: { status: { [Op.ne]: 'resolved' } },
    });
    const criticalCount = await Incident.count({
      where: { severity: 'critical', status: { [Op.ne]: 'resolved' } },
    });

    return res.json({
      success: true,
      count: incidents.length,
      summary: {
        active: activeCount,
        critical: criticalCount,
      },
      data: incidents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single incident
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        { model: Monitor, as: 'monitor' },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'role'] },
      ],
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    return res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create manual incident
router.post('/', authenticateToken, validate(incidentValidation), async (req, res) => {
  try {
    const { title, description, severity = 'high', status = 'investigating', monitorId, assignedToId } = req.body;

    const incident = await Incident.create({
      title,
      description,
      severity,
      status,
      monitorId: monitorId || null,
      assignedToId: assignedToId || req.user.id,
      triggeredBy: 'manual',
      timelineJson: [
        {
          timestamp: new Date().toISOString(),
          action: 'MANUAL_REPORT',
          note: description || 'Manually reported incident',
          author: req.user.name,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update incident details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    const { title, description, severity, status, rootCause, resolutionNotes, assignedToId } = req.body;
    const timeline = incident.timelineJson || [];

    if (status && status !== incident.status) {
      timeline.push({
        timestamp: new Date().toISOString(),
        action: `STATUS_CHANGE_TO_${status.toUpperCase()}`,
        note: `Status changed from ${incident.status} to ${status}`,
        author: req.user.name,
      });

      if (status === 'resolved' && !incident.resolvedAt) {
        incident.resolvedAt = new Date();
      }
    }

    await incident.update({
      title: title ?? incident.title,
      description: description ?? incident.description,
      severity: severity ?? incident.severity,
      status: status ?? incident.status,
      rootCause: rootCause ?? incident.rootCause,
      resolutionNotes: resolutionNotes ?? incident.resolutionNotes,
      assignedToId: assignedToId !== undefined ? assignedToId : incident.assignedToId,
      timelineJson: timeline,
    });

    return res.json({
      success: true,
      message: 'Incident updated successfully.',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add timeline comment/update to incident
router.post('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    const { note, action = 'NOTE_ADDED' } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required.',
      });
    }

    const timeline = incident.timelineJson || [];
    timeline.push({
      timestamp: new Date().toISOString(),
      action: action.toUpperCase(),
      note: note.trim(),
      author: req.user.name,
    });

    incident.timelineJson = timeline;
    await incident.save();

    return res.json({
      success: true,
      message: 'Timeline entry added.',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Acknowledge incident quick action
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    const timeline = incident.timelineJson || [];
    timeline.push({
      timestamp: new Date().toISOString(),
      action: 'ACKNOWLEDGED',
      note: `Incident acknowledged by ${req.user.name}`,
      author: req.user.name,
    });

    await incident.update({
      status: 'identified',
      acknowledgedAt: new Date(),
      assignedToId: req.user.id,
      timelineJson: timeline,
    });

    return res.json({
      success: true,
      message: 'Incident acknowledged.',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Resolve incident quick action
router.post('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    const { rootCause, resolutionNotes } = req.body;
    const timeline = incident.timelineJson || [];
    timeline.push({
      timestamp: new Date().toISOString(),
      action: 'RESOLVED',
      note: `Incident resolved: ${resolutionNotes || 'Fixed'} (Root cause: ${rootCause || 'Unspecified'})`,
      author: req.user.name,
    });

    await incident.update({
      status: 'resolved',
      resolvedAt: new Date(),
      rootCause: rootCause || incident.rootCause,
      resolutionNotes: resolutionNotes || incident.resolutionNotes,
      timelineJson: timeline,
    });

    return res.json({
      success: true,
      message: 'Incident marked as resolved.',
      data: incident,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete incident (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: `Incident with ID ${req.params.id} not found.`,
      });
    }

    await incident.destroy();

    return res.json({
      success: true,
      message: `Incident ${incident.incidentCode} deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
