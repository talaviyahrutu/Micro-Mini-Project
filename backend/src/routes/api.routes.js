const express = require('express');
const router = express.Router();
const { Api, HealthCheck, Incident } = require('../models');
const { protect } = require('../middleware/auth');
const { apiValidation } = require('../middleware/validate');
const { executeHealthCheck } = require('../services/ping.service');
const { scheduleApi, unscheduleApi } = require('../services/scheduler.service');

// @route   GET /api/apis
// @desc    Get all registered APIs with search, filter, and pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, status, enabled, page = 1, limit = 50 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { url: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.currentStatus = status;
    }

    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Api.countDocuments(query);
    const apis = await Api.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      count: apis.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: apis,
    });
  } catch (err) {
    console.error('[ApiRoutes] Error fetching APIs:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/apis
// @desc    Register a new API endpoint for monitoring
// @access  Private
router.post('/', protect, apiValidation, async (req, res) => {
  try {
    const { name, url, method, expectedStatusCode, interval, timeout, enabled } = req.body;

    const newApi = await Api.create({
      name,
      url,
      method: method || 'GET',
      expectedStatusCode: expectedStatusCode || 200,
      interval: interval || 30,
      timeout: timeout || 5000,
      enabled: enabled !== undefined ? enabled : true,
      createdBy: req.user._id,
      currentStatus: 'pending',
    });

    // Schedule monitoring immediately
    if (newApi.enabled) {
      scheduleApi(newApi);
    }

    res.status(201).json({
      success: true,
      message: 'API registered successfully for monitoring',
      data: newApi,
    });
  } catch (err) {
    console.error('[ApiRoutes] Error creating API:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/apis/:id
// @desc    Get details of a single API
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const api = await Api.findById(req.params.id).populate('createdBy', 'name email');
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    // Also get active open incident if any
    const activeIncident = await Incident.findOne({
      api: api._id,
      status: { $in: ['open', 'investigating', 'identified', 'monitoring'] },
    });

    res.json({
      success: true,
      data: api,
      activeIncident,
    });
  } catch (err) {
    console.error('[ApiRoutes] Error fetching API details:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PUT /api/apis/:id
// @desc    Update API configuration
// @access  Private
router.put('/:id', protect, apiValidation, async (req, res) => {
  try {
    const { name, url, method, expectedStatusCode, interval, timeout, enabled } = req.body;

    const api = await Api.findById(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    api.name = name || api.name;
    api.url = url || api.url;
    api.method = method || api.method;
    api.expectedStatusCode = expectedStatusCode !== undefined ? expectedStatusCode : api.expectedStatusCode;
    api.interval = interval || api.interval;
    api.timeout = timeout || api.timeout;
    if (enabled !== undefined) {
      api.enabled = enabled;
    }

    await api.save();

    // Reschedule in monitoring engine
    if (api.enabled) {
      scheduleApi(api);
    } else {
      unscheduleApi(api._id);
    }

    res.json({
      success: true,
      message: 'API configuration updated successfully',
      data: api,
    });
  } catch (err) {
    console.error('[ApiRoutes] Error updating API:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/apis/:id
// @desc    Delete registered API and associated logs
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    // Stop active scheduler
    unscheduleApi(api._id);

    // Clean up associated health checks and incidents
    await HealthCheck.deleteMany({ api: api._id });
    await Incident.deleteMany({ api: api._id });
    await Api.findByIdAndDelete(api._id);

    res.json({
      success: true,
      message: 'API and associated monitoring history deleted successfully',
    });
  } catch (err) {
    console.error('[ApiRoutes] Error deleting API:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/apis/:id/check
// @desc    Trigger an on-demand manual health check
// @access  Private
router.post('/:id/check', protect, async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) {
      return res.status(404).json({ success: false, message: 'API not found' });
    }

    const result = await executeHealthCheck(api._id);

    const updatedApi = await Api.findById(api._id);

    res.json({
      success: true,
      message: 'Manual health check executed',
      result,
      api: updatedApi,
    });
  } catch (err) {
    console.error('[ApiRoutes] Manual check error:', err.message);
    res.status(500).json({ success: false, message: 'Health check probe failed', error: err.message });
  }
});

// @route   GET /api/apis/:id/history
// @desc    Retrieve historical health check results with pagination / sparkline data
// @access  Private
router.get('/:id/history', protect, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await HealthCheck.countDocuments({ api: req.params.id });

    const history = await HealthCheck.find({ api: req.params.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    // Also build a condensed chronological series for sparklines (last 20 checks)
    const sparklineData = await HealthCheck.find({ api: req.params.id })
      .sort({ timestamp: -1 })
      .limit(20)
      .select('timestamp responseTime status statusCode');

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      history,
      sparkline: sparklineData.reverse(), // chronological order
    });
  } catch (err) {
    console.error('[ApiRoutes] History fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
