const { sequelize, User, Monitor, HealthCheck, Incident, AlertRule } = require('../models');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Synchronizing database tables...');
    await sequelize.sync({ force: true }); // Clean slate for fresh seeding

    console.log('[Seeder] Creating default users...');
    const adminUser = await User.create({
      name: 'Alex Vance (Lead SRE)',
      email: 'admin@apisentinel.dev',
      password: 'Admin@123',
      role: 'admin',
      department: 'Platform Reliability & Infrastructure',
    });

    const analystUser = await User.create({
      name: 'Maya Lin (Incident Specialist)',
      email: 'analyst@apisentinel.dev',
      password: 'User@123',
      role: 'analyst',
      department: '24/7 Operations Command',
    });

    const viewerUser = await User.create({
      name: 'David Kim (Product Director)',
      email: 'viewer@apisentinel.dev',
      password: 'Viewer@123',
      role: 'viewer',
      department: 'Product Management',
    });

    console.log('[Seeder] Creating default monitors...');
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;

    const monitorPayment = await Monitor.create({
      name: 'Core Payment Gateway',
      url: `${baseUrl}/api/mock/healthy`,
      method: 'GET',
      expectedStatusCode: 200,
      intervalSeconds: 15,
      timeoutMs: 3000,
      environment: 'production',
      status: 'healthy',
      lastResponseTime: 42,
      lastStatusCode: 200,
      uptimePercentage: 99.98,
      consecutiveFailures: 0,
      description: 'Stripe and PayPal redundant processing bridge',
    });

    const monitorOrders = await Monitor.create({
      name: 'Order Processing Pipeline',
      url: `${baseUrl}/api/mock/service-target`,
      method: 'GET',
      expectedStatusCode: 200,
      intervalSeconds: 15,
      timeoutMs: 4000,
      environment: 'production',
      status: 'healthy',
      lastResponseTime: 65,
      lastStatusCode: 200,
      uptimePercentage: 98.45,
      consecutiveFailures: 0,
      description: 'Kafka event consumers and fulfillment dispatch',
    });

    const monitorAnalytics = await Monitor.create({
      name: 'Real-time Analytics API',
      url: `${baseUrl}/api/mock/slow`,
      method: 'GET',
      expectedStatusCode: 200,
      intervalSeconds: 30,
      timeoutMs: 5000,
      environment: 'staging',
      status: 'degraded',
      lastResponseTime: 1240,
      lastStatusCode: 200,
      uptimePercentage: 96.2,
      consecutiveFailures: 0,
      description: 'Aggregates clickstream events and conversion funnels',
    });

    const monitorAuth = await Monitor.create({
      name: 'OAuth2 SSO Microservice',
      url: `${baseUrl}/api/mock/flaky`,
      method: 'GET',
      expectedStatusCode: 200,
      intervalSeconds: 20,
      timeoutMs: 4000,
      environment: 'production',
      status: 'healthy',
      lastResponseTime: 85,
      lastStatusCode: 200,
      uptimePercentage: 94.5,
      consecutiveFailures: 0,
      description: 'Single sign-on tokens and role federation',
    });

    const monitorDocs = await Monitor.create({
      name: 'Developer Portal & Docs',
      url: `${baseUrl}/api/mock/healthy`,
      method: 'GET',
      expectedStatusCode: 200,
      intervalSeconds: 60,
      timeoutMs: 5000,
      environment: 'internal',
      status: 'healthy',
      lastResponseTime: 38,
      lastStatusCode: 200,
      uptimePercentage: 100.0,
      consecutiveFailures: 0,
      description: 'Public OpenAPI Swagger UI and Developer SDK Hub',
    });

    console.log('[Seeder] Generating realistic historical health checks...');
    const monitors = [monitorPayment, monitorOrders, monitorAnalytics, monitorAuth, monitorDocs];
    const now = Date.now();

    for (const mon of monitors) {
      for (let i = 24; i >= 0; i--) {
        const checkTime = new Date(now - i * 60 * 1000 * 5); // every 5 mins
        let isSuccess = true;
        let statusCode = 200;
        let responseTimeMs = Math.floor(Math.random() * 60) + 30;
        let status = 'healthy';

        if (mon.id === monitorAnalytics.id) {
          responseTimeMs = Math.floor(Math.random() * 400) + 1100;
          status = 'degraded';
        } else if (mon.id === monitorAuth.id && i % 6 === 0) {
          isSuccess = false;
          statusCode = 500;
          status = 'down';
        }

        await HealthCheck.create({
          monitorId: mon.id,
          status,
          statusCode,
          responseTimeMs,
          isSuccess,
          errorMessage: isSuccess ? null : 'Simulated intermittent timeout error',
          checkedAt: checkTime,
        });
      }
    }

    console.log('[Seeder] Creating alert rules...');
    await AlertRule.create({
      name: 'High Severity: 2x Consecutive Failures',
      monitorId: null, // global
      conditionType: 'consecutive_failures',
      thresholdValue: 2,
      channel: 'incident',
      targetRecipient: 'sre-oncall@apisentinel.dev',
      isEnabled: true,
    });

    await AlertRule.create({
      name: 'Latency Degraded Alert (>1000ms)',
      monitorId: monitorAnalytics.id,
      conditionType: 'latency_threshold',
      thresholdValue: 1000,
      channel: 'slack',
      targetRecipient: 'https://hooks.slack.com/services/T00/B00/sentinel-ops',
      isEnabled: true,
    });

    console.log('[Seeder] Creating sample incident...');
    await Incident.create({
      incidentCode: 'INC-7042',
      monitorId: monitorOrders.id,
      title: 'Elevated Latency in Order Fulfillment Pipeline',
      description: 'Upstream message queue experienced brief backpressure during inventory sync batch.',
      severity: 'medium',
      status: 'resolved',
      triggeredBy: 'automatic',
      rootCause: 'Redis connection pool starvation due to non-batched lock acquisitions.',
      resolutionNotes: 'Expanded pool max connections from 50 to 200 and enabled idle connection reaping.',
      assignedToId: analystUser.id,
      acknowledgedAt: new Date(now - 7200000),
      resolvedAt: new Date(now - 1800000),
      timelineJson: [
        {
          timestamp: new Date(now - 7200000).toISOString(),
          action: 'AUTO_TRIGGERED',
          note: 'Sentinel Ping Engine detected 3 consecutive timeout spikes',
          author: 'System Sentinel',
        },
        {
          timestamp: new Date(now - 6800000).toISOString(),
          action: 'ACKNOWLEDGED',
          note: 'Maya Lin acknowledged the incident and engaged the backend on-call engineer.',
          author: 'Maya Lin',
        },
        {
          timestamp: new Date(now - 3600000).toISOString(),
          action: 'MITIGATION_APPLIED',
          note: 'Redis pool configuration updated and rolled out across worker pods.',
          author: 'Alex Vance',
        },
        {
          timestamp: new Date(now - 1800000).toISOString(),
          action: 'RESOLVED',
          note: 'Metrics returned to nominal levels (p99 latency < 75ms). Incident marked as resolved.',
          author: 'Maya Lin',
        },
      ],
    });

    console.log('✅ [Seeder] Database seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Credentials:');
    console.log('  Admin:   admin@apisentinel.dev   / Admin@123');
    console.log('  Analyst: analyst@apisentinel.dev / User@123');
    console.log('  Viewer:  viewer@apisentinel.dev  / Viewer@123');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('❌ [Seeder] Error during seeding:', error);
  }
};

if (require.main === module) {
  seedDatabase().then(() => {
    sequelize.close();
  });
}

module.exports = seedDatabase;
