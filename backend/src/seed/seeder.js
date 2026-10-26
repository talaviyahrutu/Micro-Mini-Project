require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Api, HealthCheck, Incident } = require('../models');

async function seedData() {
  try {
    console.log('[Seeder] Connecting to database...');
    await connectDB();

    console.log('[Seeder] Cleaning existing collections...');
    await User.deleteMany({});
    await Api.deleteMany({});
    await HealthCheck.deleteMany({});
    await Incident.deleteMany({});

    console.log('[Seeder] Creating default users...');
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@sentinel.dev',
      password: 'admin123',
      role: 'admin',
    });

    const analyst = await User.create({
      name: 'Operations Analyst',
      email: 'analyst@sentinel.dev',
      password: 'analyst123',
      role: 'analyst',
    });

    console.log('[Seeder] Creating monitored APIs...');
    const paymentApi = await Api.create({
      name: 'Payment Gateway Core',
      url: 'http://localhost:5000/api/mock/payment-gateway',
      method: 'GET',
      expectedStatusCode: 200,
      interval: 15,
      timeout: 5000,
      enabled: true,
      currentStatus: 'healthy',
      lastResponseTime: 84,
      lastStatusCode: 200,
      uptimePercentage: 99.8,
      totalChecks: 120,
      successfulChecks: 119,
      createdBy: admin._id,
    });

    const authApi = await Api.create({
      name: 'SSO Authentication Service',
      url: 'http://localhost:5000/api/mock/auth-service',
      method: 'GET',
      expectedStatusCode: 200,
      interval: 20,
      timeout: 3000,
      enabled: true,
      currentStatus: 'healthy',
      lastResponseTime: 42,
      lastStatusCode: 200,
      uptimePercentage: 100.0,
      totalChecks: 180,
      successfulChecks: 180,
      createdBy: admin._id,
    });

    const orderApi = await Api.create({
      name: 'Order Processing Engine',
      url: 'http://localhost:5000/api/mock/order-service',
      method: 'GET',
      expectedStatusCode: 200,
      interval: 30,
      timeout: 5000,
      enabled: true,
      currentStatus: 'healthy',
      lastResponseTime: 65,
      lastStatusCode: 200,
      uptimePercentage: 99.5,
      totalChecks: 90,
      successfulChecks: 89,
      createdBy: admin._id,
    });

    const publicGithub = await Api.create({
      name: 'GitHub Platform Status API',
      url: 'https://www.githubstatus.com/api/v2/status.json',
      method: 'GET',
      expectedStatusCode: 200,
      interval: 60,
      timeout: 8000,
      enabled: true,
      currentStatus: 'healthy',
      lastResponseTime: 120,
      lastStatusCode: 200,
      uptimePercentage: 100.0,
      totalChecks: 45,
      successfulChecks: 45,
      createdBy: analyst._id,
    });

    console.log('[Seeder] Generating sample telemetry history...');
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const timestamp = new Date(now - i * 30000);
      await HealthCheck.create({
        api: paymentApi._id,
        timestamp,
        status: 'healthy',
        statusCode: 200,
        responseTime: Math.floor(Math.random() * 40) + 60,
      });

      await HealthCheck.create({
        api: authApi._id,
        timestamp,
        status: 'healthy',
        statusCode: 200,
        responseTime: Math.floor(Math.random() * 25) + 30,
      });

      await HealthCheck.create({
        api: orderApi._id,
        timestamp,
        status: 'healthy',
        statusCode: 200,
        responseTime: Math.floor(Math.random() * 30) + 45,
      });
    }

    console.log('[Seeder] Seeding sample resolved incident...');
    await Incident.create({
      api: paymentApi._id,
      title: 'Intermittent Stripe Webhook Latency',
      severity: 'minor',
      status: 'resolved',
      startTime: new Date(now - 7200000), // 2 hours ago
      acknowledgedAt: new Date(now - 6600000),
      resolvedAt: new Date(now - 3600000),
      description: 'Webhook delivery latency spiked to 1200ms following upstream payment network maintenance.',
      rootCause: 'Upstream gateway DNS routing failover resolved by vendor.',
      assignedTo: analyst._id,
      timeline: [
        {
          timestamp: new Date(now - 7200000),
          status: 'open',
          note: 'Incident detected automatically via probe latency breach.',
          updatedBy: admin._id,
        },
        {
          timestamp: new Date(now - 6600000),
          status: 'investigating',
          note: 'Analyst assigned and escalated to vendor network team.',
          updatedBy: analyst._id,
        },
        {
          timestamp: new Date(now - 3600000),
          status: 'resolved',
          note: 'Latency returned to normal baseline (<100ms). Verified healthy.',
          updatedBy: analyst._id,
        },
      ],
    });

    console.log(`=======================================================`);
    console.log(`✅ Database successfully seeded with sample demo data!`);
    console.log(`   Admin Login:   admin@sentinel.dev / admin123`);
    console.log(`   Analyst Login: analyst@sentinel.dev / analyst123`);
    console.log(`   Monitored APIs: 4 configured endpoints`);
    console.log(`=======================================================`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Seeding error:', error);
    process.exit(1);
  }
}

seedData();
