const axios = require('axios');
const { Api, HealthCheck, Incident } = require('../models');
const { validateTargetUrl } = require('../middleware/ssrfProtection');

/**
 * Execute a safe HTTP health check against an API endpoint.
 * Protects against SSRF, measures latency, records logs, and triggers incidents.
 */
async function executeHealthCheck(apiId) {
  const api = await Api.findById(apiId);
  if (!api || !api.enabled) {
    return null;
  }

  // 1. SSRF Validation
  const allowPrivate = process.env.SSRF_ALLOW_PRIVATE_IPS === 'true';
  const urlCheck = await validateTargetUrl(api.url, allowPrivate);
  
  if (!urlCheck.valid) {
    const errorMsg = `Security Block: ${urlCheck.reason}`;
    return await recordFailure(api, 0, null, errorMsg, 'unhealthy');
  }

  // 2. HTTP Probe
  const startTime = process.hrtime.bigint();
  let statusCode = null;
  let responseTime = 0;
  let isHealthy = false;
  let errorMessage = null;

  try {
    const response = await axios({
      method: api.method || 'GET',
      url: api.url,
      timeout: api.timeout || 5000,
      validateStatus: () => true, // capture all status codes without throwing
      headers: {
        'User-Agent': 'APISentinel-HealthProbe/1.0',
        'Accept': '*/*',
      },
      maxRedirects: 3,
    });

    const endTime = process.hrtime.bigint();
    responseTime = Number((endTime - startTime) / 1000000n); // Convert nanoseconds to milliseconds

    statusCode = response.status;
    const expected = api.expectedStatusCode || 200;

    if (statusCode === expected) {
      isHealthy = true;
    } else {
      isHealthy = false;
      errorMessage = `HTTP Status Mismatch: Received ${statusCode}, expected ${expected}`;
    }
  } catch (error) {
    const endTime = process.hrtime.bigint();
    responseTime = Number((endTime - startTime) / 1000000n);

    isHealthy = false;
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = `Request Timeout: exceeded ${api.timeout}ms limit`;
      statusCode = 408;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = `DNS Lookup Failed: Host not found`;
      statusCode = 502;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `Connection Refused: Target port unreachable`;
      statusCode = 503;
    } else {
      errorMessage = error.message || 'Unknown network error';
      statusCode = 500;
    }
  }

  // 3. Persist HealthCheck Log
  const checkLog = await HealthCheck.create({
    api: api._id,
    timestamp: new Date(),
    status: isHealthy ? 'healthy' : 'unhealthy',
    statusCode,
    responseTime: Math.round(responseTime),
    errorMessage: isHealthy ? null : errorMessage,
  });

  // 4. Update API Telemetry
  api.lastCheckedAt = new Date();
  api.lastResponseTime = Math.round(responseTime);
  api.lastStatusCode = statusCode;
  api.lastErrorMessage = isHealthy ? null : errorMessage;
  api.totalChecks = (api.totalChecks || 0) + 1;

  if (isHealthy) {
    api.successfulChecks = (api.successfulChecks || 0) + 1;
    api.consecutiveFailures = 0;
    api.currentStatus = 'healthy';
  } else {
    api.consecutiveFailures = (api.consecutiveFailures || 0) + 1;
    api.currentStatus = 'unhealthy';
  }

  // Calculate rolling uptime percentage
  api.uptimePercentage = Number(
    ((api.successfulChecks / api.totalChecks) * 100).toFixed(2)
  );

  await api.save();

  // 5. Automated Incident Creation (on failure, avoid duplicate active incidents)
  if (!isHealthy) {
    await handleIncidentCreation(api, errorMessage, statusCode);
  }

  return {
    apiId: api._id,
    name: api.name,
    status: api.currentStatus,
    statusCode,
    responseTime: Math.round(responseTime),
    errorMessage,
    checkId: checkLog._id,
  };
}

/**
 * Helper to record safety / validation failures
 */
async function recordFailure(api, responseTime, statusCode, errorMessage, status = 'unhealthy') {
  await HealthCheck.create({
    api: api._id,
    timestamp: new Date(),
    status,
    statusCode,
    responseTime,
    errorMessage,
  });

  api.lastCheckedAt = new Date();
  api.lastResponseTime = responseTime;
  api.lastStatusCode = statusCode;
  api.lastErrorMessage = errorMessage;
  api.consecutiveFailures = (api.consecutiveFailures || 0) + 1;
  api.currentStatus = 'unhealthy';
  api.totalChecks = (api.totalChecks || 0) + 1;
  api.uptimePercentage = Number(
    ((api.successfulChecks / api.totalChecks) * 100).toFixed(2)
  );
  await api.save();

  await handleIncidentCreation(api, errorMessage, statusCode);

  return {
    apiId: api._id,
    name: api.name,
    status: 'unhealthy',
    statusCode,
    responseTime,
    errorMessage,
  };
}

/**
 * Automatically create an Incident when an API fails,
 * preventing duplicate open incidents for the same API.
 */
async function handleIncidentCreation(api, errorMessage, statusCode) {
  try {
    // Check if an unresolved incident already exists for this API
    const existingOpenIncident = await Incident.findOne({
      api: api._id,
      status: { $in: ['open', 'investigating', 'identified', 'monitoring'] },
    });

    if (existingOpenIncident) {
      // Incident already active, do not create duplicate
      return existingOpenIncident;
    }

    // Determine severity based on consecutive failures or error type
    let severity = 'major';
    if (api.consecutiveFailures >= 3 || statusCode === 500 || statusCode === 503) {
      severity = 'critical';
    } else if (statusCode === 408) {
      severity = 'major';
    } else {
      severity = 'minor';
    }

    const title = `Service Outage: ${api.name} (${api.method} ${api.url})`;
    const description = `API Sentinel detected failure on endpoint '${api.name}'. Status Code: ${statusCode || 'N/A'}. Error: ${errorMessage}`;

    const newIncident = await Incident.create({
      api: api._id,
      title,
      severity,
      status: 'open',
      startTime: new Date(),
      description,
      rootCause: `Detected via automated probe: ${errorMessage}`,
      timeline: [
        {
          timestamp: new Date(),
          status: 'open',
          note: `Incident automatically opened following probe failure (Status: ${statusCode || 'ERR'}).`,
        },
      ],
    });

    console.log(`[IncidentEngine] 🚨 Automated Incident created for ${api.name}: "${title}" [${severity}]`);
    return newIncident;
  } catch (err) {
    console.error(`[IncidentEngine] Error creating incident:`, err.message);
  }
}

module.exports = {
  executeHealthCheck,
};
