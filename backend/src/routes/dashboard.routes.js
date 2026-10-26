const express = require('express');
const router = express.Router();
const { Api, Incident, HealthCheck } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Retrieve high-level summary KPIs and real-time dashboard telemetry
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const [
      totalApis,
      healthyApis,
      unhealthyApis,
      pendingApis,
      openIncidentsCount,
      criticalIncidentsCount,
      recentIncidents,
      recentChecks,
    ] = await Promise.all([
      Api.countDocuments(),
      Api.countDocuments({ currentStatus: 'healthy' }),
      Api.countDocuments({ currentStatus: 'unhealthy' }),
      Api.countDocuments({ currentStatus: { $in: ['pending', 'degraded'] } }),
      Incident.countDocuments({
        status: { $in: ['open', 'investigating', 'identified', 'monitoring'] },
      }),
      Incident.countDocuments({
        status: { $in: ['open', 'investigating', 'identified', 'monitoring'] },
        severity: 'critical',
      }),
      Incident.find()
        .sort({ startTime: -1 })
        .limit(5)
        .populate('api', 'name url currentStatus method'),
      HealthCheck.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('api', 'name url method'),
    ]);

    // Calculate system average response time and overall uptime
    const allApis = await Api.find({}, 'lastResponseTime uptimePercentage totalChecks successfulChecks');
    
    let totalLatency = 0;
    let latencyCount = 0;
    let totalChecksSum = 0;
    let successfulChecksSum = 0;

    allApis.forEach((api) => {
      if (api.lastResponseTime !== null && api.lastResponseTime !== undefined) {
        totalLatency += api.lastResponseTime;
        latencyCount += 1;
      }
      totalChecksSum += api.totalChecks || 0;
      successfulChecksSum += api.successfulChecks || 0;
    });

    const avgResponseTime = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    const overallUptime = totalChecksSum > 0
      ? Number(((successfulChecksSum / totalChecksSum) * 100).toFixed(2))
      : 100.0;

    res.json({
      success: true,
      data: {
        summary: {
          totalApis,
          healthyApis,
          unhealthyApis,
          pendingApis,
          openIncidents: openIncidentsCount,
          criticalIncidents: criticalIncidentsCount,
          avgResponseTime, // in ms
          overallUptime,   // in percentage
        },
        recentIncidents,
        recentChecks,
      },
    });
  } catch (err) {
    console.error('[DashboardRoutes] Error computing stats:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
