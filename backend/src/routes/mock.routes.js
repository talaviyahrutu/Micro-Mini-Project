const express = require('express');
const router = express.Router();

// In-memory outage simulator flags
const outageState = {
  paymentGatewayDown: false,
  authServiceDegraded: false,
  orderServiceDown: false,
};

// @route   GET /api/mock/payment-gateway
router.get('/payment-gateway', (req, res) => {
  if (outageState.paymentGatewayDown) {
    return res.status(503).json({
      status: 'error',
      service: 'PaymentGateway',
      error: 'Service Unavailable: Gateway timeout / Database connection dropped',
      timestamp: new Date(),
    });
  }

  // Normal simulated latency: 60-120ms
  const latency = Math.floor(Math.random() * 60) + 60;
  setTimeout(() => {
    res.status(200).json({
      status: 'healthy',
      service: 'PaymentGateway',
      version: 'v2.4.1',
      settlementQueue: 'operational',
      latency: `${latency}ms`,
    });
  }, latency);
});

// @route   GET /api/mock/auth-service
router.get('/auth-service', (req, res) => {
  if (outageState.authServiceDegraded) {
    return res.status(500).json({
      status: 'fatal',
      service: 'AuthService',
      error: 'Internal Server Error: Redis cluster synchronization failure',
      timestamp: new Date(),
    });
  }

  const latency = Math.floor(Math.random() * 40) + 30;
  setTimeout(() => {
    res.status(200).json({
      status: 'healthy',
      service: 'AuthService',
      activeSessions: 1420,
      jwtIssuer: 'sentinel-sso',
      latency: `${latency}ms`,
    });
  }, latency);
});

// @route   GET /api/mock/order-service
router.get('/order-service', (req, res) => {
  if (outageState.orderServiceDown) {
    return res.status(502).json({
      status: 'bad_gateway',
      service: 'OrderService',
      error: 'Bad Gateway: Upstream warehouse RPC failed',
      timestamp: new Date(),
    });
  }

  const latency = Math.floor(Math.random() * 50) + 40;
  setTimeout(() => {
    res.status(200).json({
      status: 'healthy',
      service: 'OrderService',
      processedOrders: 8940,
      latency: `${latency}ms`,
    });
  }, latency);
});

// @route   POST /api/mock/toggle-outage
// @desc    Toggle simulated service outages for live demonstration
router.post('/toggle-outage', (req, res) => {
  const { service, down } = req.body;

  if (service === 'payment') {
    outageState.paymentGatewayDown = down !== undefined ? down : !outageState.paymentGatewayDown;
  } else if (service === 'auth') {
    outageState.authServiceDegraded = down !== undefined ? down : !outageState.authServiceDegraded;
  } else if (service === 'order') {
    outageState.orderServiceDown = down !== undefined ? down : !outageState.orderServiceDown;
  } else {
    // Toggle all
    const anyDown = outageState.paymentGatewayDown || outageState.orderServiceDown;
    outageState.paymentGatewayDown = !anyDown;
    outageState.orderServiceDown = !anyDown;
  }

  res.json({
    success: true,
    message: 'Mock outage simulator state updated',
    state: outageState,
  });
});

// @route   GET /api/mock/status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    outageState,
  });
});

module.exports = router;
