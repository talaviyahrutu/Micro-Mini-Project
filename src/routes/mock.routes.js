const express = require('express');
const router = express.Router();

// State for mock outage simulation
let mockOutageActive = false;
let flakyCounter = 0;

// 1. Healthy endpoint (always fast 200 OK)
router.get('/healthy', (req, res) => {
  res.json({
    service: 'Mock Service: Payment Gateway API',
    status: 'OPERATIONAL',
    latency: 'low',
    timestamp: new Date().toISOString(),
  });
});

// 2. Slow endpoint (deliberately delayed to test 'degraded' health check)
router.get('/slow', async (req, res) => {
  const delayMs = parseInt(req.query.delay || '1200', 10);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  res.json({
    service: 'Mock Service: Large Analytics Engine',
    status: 'DEGRADED_LATENCY',
    simulatedDelayMs: delayMs,
    timestamp: new Date().toISOString(),
  });
});

// 3. Flaky endpoint (alternates 200 and 500)
router.get('/flaky', (req, res) => {
  flakyCounter++;
  if (flakyCounter % 2 === 0) {
    return res.status(500).json({
      service: 'Mock Service: Auth Microservice',
      error: 'Intermittent 500 Internal Server Error (Simulated Flakiness)',
      counter: flakyCounter,
    });
  }

  res.json({
    service: 'Mock Service: Auth Microservice',
    status: 'OK',
    counter: flakyCounter,
  });
});

// 4. Outage endpoint (dynamic state for live demonstration)
router.get('/service-target', (req, res) => {
  if (mockOutageActive) {
    return res.status(503).json({
      service: 'Mock Service: Order Processing Cluster',
      status: 'DOWN',
      error: '503 Service Unavailable: Database connection pool exhausted (Simulated Outage)',
      outageActive: true,
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    service: 'Mock Service: Order Processing Cluster',
    status: 'OPERATIONAL',
    outageActive: false,
    timestamp: new Date().toISOString(),
  });
});

// Outage toggle API (for the UI Outage Simulator switch)
router.get('/outage-status', (req, res) => {
  res.json({
    mockOutageActive,
  });
});

router.post('/toggle-outage', (req, res) => {
  if (typeof req.body.active === 'boolean') {
    mockOutageActive = req.body.active;
  } else {
    mockOutageActive = !mockOutageActive;
  }

  res.json({
    success: true,
    message: `Mock outage is now ${mockOutageActive ? 'ACTIVE (Endpoints will fail)' : 'RESOLVED (Endpoints operational)'}`,
    mockOutageActive,
  });
});

module.exports = router;
