const express = require('express');
const router = express.Router();
const { Incident, Api } = require('../models');
const { protect } = require('../middleware/auth');
const { incidentUpdateValidation } = require('../middleware/validate');

// @route   GET /api/incidents
// @desc    List incidents with optional filters (status, severity, apiId)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, severity, apiId, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (apiId) {
      query.api = apiId;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Incident.countDocuments(query);

    const incidents = await Incident.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('api', 'name url currentStatus method')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: incidents,
    });
  } catch (err) {
    console.error('[IncidentRoutes] Error fetching incidents:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/incidents/:id
// @desc    Get detailed incident view with full timeline
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('api')
      .populate('assignedTo', 'name email')
      .populate('timeline.updatedBy', 'name email');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (err) {
    console.error('[IncidentRoutes] Error fetching incident detail:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/incidents/:id/status
// @desc    Update incident lifecycle status (acknowledge, investigate, resolve)
// @access  Private
router.put('/:id/status', protect, incidentUpdateValidation, async (req, res) => {
  try {
    const { status, note, rootCause } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const previousStatus = incident.status;
    incident.status = status;

    if (rootCause) {
      incident.rootCause = rootCause;
    }

    // Set timestamps for lifecycle tracking
    if (status === 'investigating' && !incident.acknowledgedAt) {
      incident.acknowledgedAt = new Date();
    } else if (status === 'resolved') {
      incident.resolvedAt = new Date();
      if (!incident.acknowledgedAt) {
        incident.acknowledgedAt = new Date();
      }
    }

    // Add entry to timeline
    incident.timeline.push({
      timestamp: new Date(),
      status,
      note: note || `Status transitioned from ${previousStatus} to ${status}`,
      updatedBy: req.user._id,
    });

    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate('api', 'name url currentStatus')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: `Incident status updated to '${status}'`,
      data: populated,
    });
  } catch (err) {
    console.error('[IncidentRoutes] Status update error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/incidents/:id
// @desc    Update incident metadata (title, severity, assignedTo, rootCause)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, severity, assignedTo, rootCause, description } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (title) incident.title = title;
    if (severity) incident.severity = severity;
    if (assignedTo !== undefined) incident.assignedTo = assignedTo || null;
    if (rootCause) incident.rootCause = rootCause;
    if (description) incident.description = description;

    await incident.save();

    res.json({
      success: true,
      message: 'Incident updated successfully',
      data: incident,
    });
  } catch (err) {
    console.error('[IncidentRoutes] Error updating incident:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
