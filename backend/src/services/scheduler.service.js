const { Api } = require('../models');
const { executeHealthCheck } = require('./ping.service');

// Store active interval handles keyed by API ID
const activeTimers = new Map();
// Prevent overlapping health checks for the same endpoint
const inFlightChecks = new Set();

/**
 * Initialize the monitoring engine scheduler
 */
async function initScheduler() {
  const isAutoPingEnabled = process.env.AUTO_PING_ENABLED !== 'false';
  if (!isAutoPingEnabled) {
    console.log('[Scheduler] Background automated monitoring is disabled via AUTO_PING_ENABLED=false');
    return;
  }

  console.log('[Scheduler] ⏰ Initializing automated health monitoring engine...');
  await reloadAllMonitors();
}

/**
 * Reload all enabled APIs and set up background intervals
 */
async function reloadAllMonitors() {
  // Clear any existing timers
  for (const [apiId, timer] of activeTimers.entries()) {
    clearInterval(timer);
  }
  activeTimers.clear();

  try {
    const apis = await Api.find({ enabled: true });
    console.log(`[Scheduler] Found ${apis.length} active API(s) to schedule.`);

    for (const api of apis) {
      scheduleApi(api);
    }
  } catch (err) {
    console.error('[Scheduler] Error loading APIs for scheduler:', err.message);
  }
}

/**
 * Schedule a single API for periodic monitoring
 */
function scheduleApi(api) {
  const apiIdStr = api._id.toString();

  // Clear any previous interval for this API
  if (activeTimers.has(apiIdStr)) {
    clearInterval(activeTimers.get(apiIdStr));
    activeTimers.delete(apiIdStr);
  }

  if (!api.enabled) {
    return;
  }

  const intervalMs = Math.max((api.interval || 30) * 1000, 5000); // minimum 5s safe floor

  // Run immediate first probe asynchronously
  runCheckWithLock(apiIdStr);

  // Set recurring interval
  const timer = setInterval(() => {
    runCheckWithLock(apiIdStr);
  }, intervalMs);

  activeTimers.set(apiIdStr, timer);
  console.log(`[Scheduler] 📡 Scheduled API '${api.name}' (Interval: ${api.interval || 30}s)`);
}

/**
 * Unschedule an API
 */
function unscheduleApi(apiId) {
  const apiIdStr = apiId.toString();
  if (activeTimers.has(apiIdStr)) {
    clearInterval(activeTimers.get(apiIdStr));
    activeTimers.delete(apiIdStr);
    console.log(`[Scheduler] ⏹️ Unscheduled API ${apiIdStr}`);
  }
}

/**
 * Guarded executor preventing overlapping checks for the same endpoint
 */
async function runCheckWithLock(apiIdStr) {
  if (inFlightChecks.has(apiIdStr)) {
    console.log(`[Scheduler] ⏳ Skipping check for ${apiIdStr}: previous probe still in flight.`);
    return;
  }

  inFlightChecks.add(apiIdStr);
  try {
    await executeHealthCheck(apiIdStr);
  } catch (err) {
    console.error(`[Scheduler] Unexpected error during probe for API ${apiIdStr}:`, err.message);
  } finally {
    inFlightChecks.delete(apiIdStr);
  }
}

/**
 * Stop all monitoring schedules (e.g. on server shutdown)
 */
function stopAll() {
  for (const timer of activeTimers.values()) {
    clearInterval(timer);
  }
  activeTimers.clear();
  console.log('[Scheduler] All active monitoring intervals cleared.');
}

module.exports = {
  initScheduler,
  reloadAllMonitors,
  scheduleApi,
  unscheduleApi,
  runCheckWithLock,
  stopAll,
};
