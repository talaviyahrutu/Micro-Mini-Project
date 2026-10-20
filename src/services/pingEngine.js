const axios = require('axios');
const { Monitor, HealthCheck, Incident, AlertRule } = require('../models');

// Perform a single ping to a monitor instance
const pingMonitor = async (monitor) => {
  if (!monitor || !monitor.isActive) return null;

  const startTime = Date.now();
  let statusCode = null;
  let responseTimeMs = 0;
  let isSuccess = false;
  let errorMessage = null;
  let calculatedStatus = 'down';

  try {
    const config = {
      method: (monitor.method || 'GET').toLowerCase(),
      url: monitor.url,
      timeout: monitor.timeoutMs || 5000,
      validateStatus: () => true, // Don't throw on 4xx/5xx, let us inspect status code
      headers: monitor.headersJson || {},
    };

    if (['post', 'put', 'patch'].includes(config.method) && monitor.bodyPayload) {
      try {
        config.data = JSON.parse(monitor.bodyPayload);
      } catch (e) {
        config.data = monitor.bodyPayload;
      }
    }

    const response = await axios(config);
    responseTimeMs = Date.now() - startTime;
    statusCode = response.status;

    const expected = monitor.expectedStatusCode || 200;
    if (statusCode === expected || (expected === 200 && statusCode >= 200 && statusCode < 300)) {
      isSuccess = true;
      calculatedStatus = responseTimeMs > 1000 ? 'degraded' : 'healthy';
    } else {
      isSuccess = false;
      calculatedStatus = 'down';
      errorMessage = `Received status ${statusCode}, expected ${expected}`;
    }
  } catch (error) {
    responseTimeMs = Date.now() - startTime;
    isSuccess = false;
    calculatedStatus = 'down';
    errorMessage = error.code ? `${error.code}: ${error.message}` : error.message;
  }

  // Record HealthCheck log
  const healthCheck = await HealthCheck.create({
    monitorId: monitor.id,
    status: calculatedStatus,
    statusCode,
    responseTimeMs,
    isSuccess,
    errorMessage,
    checkedAt: new Date(),
  });

  // Calculate new consecutive failures
  const newConsecutiveFailures = isSuccess ? 0 : (monitor.consecutiveFailures || 0) + 1;

  // Compute 24h rolling uptime percentage
  let uptimePercentage = monitor.uptimePercentage;
  try {
    const totalChecks = await HealthCheck.count({ where: { monitorId: monitor.id } });
    const successfulChecks = await HealthCheck.count({
      where: {
        monitorId: monitor.id,
        isSuccess: true,
      },
    });
    if (totalChecks > 0) {
      uptimePercentage = parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2));
    }
  } catch (e) {
    // fallback
  }

  // Update Monitor
  await monitor.update({
    status: calculatedStatus,
    lastCheckedAt: new Date(),
    lastResponseTime: responseTimeMs,
    lastStatusCode: statusCode,
    uptimePercentage,
    consecutiveFailures: newConsecutiveFailures,
  });

  // Check alert triggers & incident creation
  await processAlertsAndIncidents(monitor, calculatedStatus, responseTimeMs, newConsecutiveFailures, errorMessage);

  return {
    monitorId: monitor.id,
    status: calculatedStatus,
    statusCode,
    responseTimeMs,
    isSuccess,
    errorMessage,
    checkedAt: healthCheck.checkedAt,
  };
};

// Automated alert evaluation & incident creation
const processAlertsAndIncidents = async (monitor, status, responseTimeMs, consecutiveFailures, errorMessage) => {
  try {
    // Check if monitor is DOWN and has >= 2 consecutive failures
    if (status === 'down' && consecutiveFailures >= 2) {
      // Check if there is already an open incident for this monitor
      const existingIncident = await Incident.findOne({
        where: {
          monitorId: monitor.id,
          status: ['investigating', 'identified', 'monitoring'],
        },
      });

      if (!existingIncident) {
        // Auto-create incident
        const title = `Service Outage: ${monitor.name} is DOWN`;
        const description = `Endpoint [${monitor.method} ${monitor.url}] failed ${consecutiveFailures} consecutive health checks. Reason: ${errorMessage || 'Status code mismatch or timeout'}`;

        await Incident.create({
          monitorId: monitor.id,
          title,
          description,
          severity: consecutiveFailures >= 4 ? 'critical' : 'high',
          status: 'investigating',
          triggeredBy: 'automatic',
          timelineJson: [
            {
              timestamp: new Date().toISOString(),
              action: 'AUTO_TRIGGERED',
              note: `Automated ping detected outage: ${errorMessage || 'Unresponsive'}`,
              author: 'Sentinel Ping Engine',
            },
          ],
        });
        console.log(`[Sentinel Engine] Auto-created Incident for Monitor ${monitor.name}`);
      }
    } else if (status === 'healthy' && consecutiveFailures === 0) {
      // Check if an open incident exists and add recovery timeline note
      const existingIncident = await Incident.findOne({
        where: {
          monitorId: monitor.id,
          status: ['investigating', 'identified', 'monitoring'],
        },
      });

      if (existingIncident) {
        const timeline = existingIncident.timelineJson || [];
        // Only append recovery notice if not recently appended
        const lastAction = timeline[timeline.length - 1];
        if (!lastAction || lastAction.action !== 'SERVICE_RECOVERED') {
          timeline.push({
            timestamp: new Date().toISOString(),
            action: 'SERVICE_RECOVERED',
            note: `Service has recovered. Last ping responded with 200 OK (${responseTimeMs}ms). Ready for incident resolution.`,
            author: 'Sentinel Ping Engine',
          });
          existingIncident.status = 'monitoring';
          existingIncident.timelineJson = timeline;
          await existingIncident.save();
          console.log(`[Sentinel Engine] Updated incident ${existingIncident.incidentCode} to 'monitoring' after recovery.`);
        }
      }
    }

    // Evaluate custom AlertRules
    const rules = await AlertRule.findAll({
      where: {
        isEnabled: true,
      },
    });

    for (const rule of rules) {
      if (rule.monitorId && rule.monitorId !== monitor.id) continue;

      let triggered = false;
      if (rule.conditionType === 'consecutive_failures' && consecutiveFailures >= rule.thresholdValue) {
        triggered = true;
      } else if (rule.conditionType === 'latency_threshold' && responseTimeMs > rule.thresholdValue) {
        triggered = true;
      }

      if (triggered) {
        await rule.update({ lastTriggeredAt: new Date() });
        console.log(`[AlertRule] Rule '${rule.name}' triggered for monitor '${monitor.name}' via channel ${rule.channel}!`);
      }
    }
  } catch (error) {
    console.error(`[Sentinel Engine] Error in processAlertsAndIncidents:`, error.message);
  }
};

// Scheduler loop
let schedulerTimer = null;

const runAllPings = async () => {
  try {
    const monitors = await Monitor.findAll({ where: { isActive: true } });
    if (!monitors || monitors.length === 0) return;

    // Run concurrently with Promise.allSettled
    await Promise.allSettled(monitors.map((m) => pingMonitor(m)));
  } catch (error) {
    console.error(`[Sentinel Scheduler] Error running batch pings:`, error.message);
  }
};

const startScheduler = (intervalMs = 30000) => {
  if (schedulerTimer) clearInterval(schedulerTimer);

  console.log(`[Sentinel Scheduler] Background Health Check Engine started (Interval: ${intervalMs}ms)`);
  // Run an initial ping round after 2 seconds
  setTimeout(runAllPings, 2000);
  schedulerTimer = setInterval(runAllPings, intervalMs);
};

const stopScheduler = () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log(`[Sentinel Scheduler] Background Health Check Engine stopped`);
  }
};

module.exports = {
  pingMonitor,
  runAllPings,
  startScheduler,
  stopScheduler,
};
