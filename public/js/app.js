/**
 * API Sentinel — Core Application Orchestrator
 */

const App = {
  activeTab: 'endpoints',
  refreshInterval: null,

  init: async () => {
    // 1. Initialize Auth
    await Auth.init();

    // 2. Initialize sub-controllers
    Monitors.init();
    Incidents.init();

    // 3. Setup Tab Navigation
    App.setupTabs();

    // 4. Setup Global Action Buttons
    App.setupGlobalActions();

    // 5. Initial Data Load
    await App.loadAll();

    // 6. Check Outage Simulator state
    await App.checkOutageStatus();

    // 7. Background Auto-refresh every 6 seconds
    App.refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        Monitors.loadMonitors();
        Incidents.loadIncidents();
        App.loadTelemetryLogs();
        App.loadStats();
      }
    }, 6000);
  },

  setupTabs: () => {
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        App.switchTab(target);
      });
    });
  },

  switchTab: (tabName) => {
    App.activeTab = tabName;

    // Update buttons
    document.querySelectorAll('.nav-tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    // Update views
    document.querySelectorAll('.tab-view').forEach((v) => {
      v.classList.toggle('active', v.id === `view-${tabName}`);
    });

    // Trigger on-demand loads
    if (tabName === 'telemetry') App.loadTelemetryLogs();
    if (tabName === 'alerts') App.loadAlertRules();
    if (tabName === 'diagnostics') App.loadDiagnostics();
  },

  setupGlobalActions: () => {
    // Ping All button
    const pingAllBtn = document.getElementById('btn-ping-all');
    if (pingAllBtn) {
      pingAllBtn.addEventListener('click', async () => {
        pingAllBtn.disabled = true;
        showToast('Initiating background health ping across all active services...', 'info');
        try {
          await api.monitors.pingAll();
          setTimeout(() => {
            Monitors.loadMonitors();
            Incidents.loadIncidents();
            App.loadTelemetryLogs();
            pingAllBtn.disabled = false;
          }, 1500);
        } catch (e) {
          pingAllBtn.disabled = false;
        }
      });
    }

    // Role switcher demo buttons
    document.querySelectorAll('[data-switch-role]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.switchRole;
        Auth.quickLogin(role);
      });
    });

    // Outage Simulator Switch
    const outageSwitch = document.getElementById('outage-simulator-toggle');
    if (outageSwitch) {
      outageSwitch.addEventListener('change', async (e) => {
        const isOutage = e.target.checked;
        try {
          await api.mock.toggleOutage(isOutage);
          App.updateSimulatorVisuals(isOutage);

          if (isOutage) {
            showToast('⚠️ Outage triggered on Order Processing Cluster! Initiating ping sequence...', 'error');
          } else {
            showToast('✅ Outage resolved! Service restored to nominal status.', 'success');
          }

          // Trigger rapid pings so the status changes in real time
          await api.monitors.pingAll();
          setTimeout(() => {
            Monitors.loadMonitors();
            Incidents.loadIncidents();
          }, 1000);
        } catch (err) {
          showToast(`Simulator toggle error: ${err.message}`, 'error');
        }
      });
    }

    // Alert Rule Form Submit
    const alertForm = document.getElementById('alert-rule-form');
    if (alertForm) {
      alertForm.addEventListener('submit', App.handleAlertRuleSubmit);
    }
  },

  loadAll: async () => {
    await Promise.allSettled([
      Monitors.loadMonitors(),
      Incidents.loadIncidents(),
      App.loadStats(),
      App.loadTelemetryLogs(),
    ]);
  },

  loadStats: async () => {
    try {
      const res = await api.health.stats();
      if (res.data) {
        document.getElementById('kpi-avg-latency').textContent = `${res.data.avgLatencyMs}ms`;
        document.getElementById('kpi-total-checks').textContent = res.data.totalChecks;
        
        // Render sparkline for global latency KPI
        const kpiSparkline = document.getElementById('kpi-latency-sparkline');
        if (kpiSparkline && res.data.recentChecks) {
          kpiSparkline.innerHTML = Charts.generateSparklineSvg(res.data.recentChecks, 'healthy', 260, 28);
        }
      }
    } catch (e) {
      console.warn('Error loading telemetry stats:', e.message);
    }
  },

  loadTelemetryLogs: async () => {
    try {
      const res = await api.health.logs({ limit: 40 });
      const tableBody = document.getElementById('telemetry-table-body');
      if (!tableBody) return;

      if (!res.data || res.data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No telemetry logs recorded yet.</td></tr>`;
        return;
      }

      tableBody.innerHTML = res.data
        .map((log) => {
          const statusClass = `status-${log.status}`;
          return `
          <tr>
            <td>
              <span class="status-pill ${statusClass}">${log.status}</span>
            </td>
            <td>
              <strong style="color:var(--text-primary);">${log.monitor ? log.monitor.name : 'Unknown Service'}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${log.monitor ? log.monitor.url : ''}</div>
            </td>
            <td>
              <span class="method-badge method-${(log.monitor?.method || 'GET').toLowerCase()}">
                ${log.monitor?.method || 'GET'}
              </span>
            </td>
            <td>
              <span style="font-family:var(--font-mono); font-weight:700; color:${log.statusCode === 200 ? 'var(--status-healthy)' : 'var(--status-down)'};">
                ${log.statusCode || 'ERR'}
              </span>
            </td>
            <td>
              <span style="font-family:var(--font-mono); font-weight:600;">
                ${log.responseTimeMs}ms
              </span>
            </td>
            <td style="font-size:0.8rem; color:var(--text-secondary); font-family:var(--font-mono);">
              ${new Date(log.checkedAt).toLocaleTimeString()}
            </td>
          </tr>
        `;
        })
        .join('');
    } catch (e) {
      console.error('Error loading telemetry logs:', e);
    }
  },

  loadAlertRules: async () => {
    try {
      const res = await api.alerts.list();
      const container = document.getElementById('alerts-table-body');
      if (!container) return;

      if (!res.data || res.data.length === 0) {
        container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No alert rules configured.</td></tr>`;
        return;
      }

      const isAdmin = window.Auth?.currentUser?.role === 'admin';

      container.innerHTML = res.data
        .map((rule) => {
          return `
          <tr>
            <td><strong>${rule.name}</strong></td>
            <td>${rule.monitor ? rule.monitor.name : '<span style="color:var(--accent-cyan); font-weight:600;">All Monitors (Global)</span>'}</td>
            <td><code style="font-family:var(--font-mono); color:var(--accent-blue);">${rule.conditionType} >= ${rule.thresholdValue}</code></td>
            <td><span class="tag-env production">${rule.channel.toUpperCase()}</span></td>
            <td>
              <label class="switch">
                <input type="checkbox" ${rule.isEnabled ? 'checked' : ''} ${isAdmin ? '' : 'disabled'} onchange="App.toggleAlertRule(${rule.id})">
                <span class="slider"></span>
              </label>
            </td>
            <td>
              ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="App.deleteAlertRule(${rule.id})">Delete</button>` : '<span style="color:var(--text-muted); font-size:0.75rem;">Locked</span>'}
            </td>
          </tr>
        `;
        })
        .join('');
    } catch (e) {
      console.error('Error loading alert rules:', e);
    }
  },

  openAlertModal: () => {
    const select = document.getElementById('alert-monitor-select');
    select.innerHTML = `<option value="">-- Global (Applies to all endpoints) --</option>`;
    if (window.Monitors && window.Monitors.allMonitors) {
      window.Monitors.allMonitors.forEach((m) => {
        select.innerHTML += `<option value="${m.id}">${m.name}</option>`;
      });
    }
    document.getElementById('alert-rule-modal').classList.add('active');
  },

  handleAlertRuleSubmit: async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('alert-name').value.trim(),
      monitorId: document.getElementById('alert-monitor-select').value || null,
      conditionType: document.getElementById('alert-condition-type').value,
      thresholdValue: parseInt(document.getElementById('alert-threshold-value').value, 10),
      channel: document.getElementById('alert-channel').value,
      targetRecipient: document.getElementById('alert-recipient').value.trim(),
    };

    try {
      await api.alerts.create(payload);
      showToast(`Alert policy '${payload.name}' created!`, 'success');
      document.getElementById('alert-rule-modal').classList.remove('active');
      App.loadAlertRules();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  },

  toggleAlertRule: async (id) => {
    try {
      const res = await api.alerts.toggle(id);
      showToast(res.message, 'info');
    } catch (e) {
      showToast(`Toggle failed: ${e.message}`, 'error');
      App.loadAlertRules();
    }
  },

  deleteAlertRule: async (id) => {
    if (!confirm('Delete this alert rule policy?')) return;
    try {
      await api.alerts.delete(id);
      showToast('Alert rule deleted.', 'info');
      App.loadAlertRules();
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  },

  checkOutageStatus: async () => {
    try {
      const res = await api.mock.getOutageStatus();
      const toggle = document.getElementById('outage-simulator-toggle');
      if (toggle) {
        toggle.checked = !!res.mockOutageActive;
        App.updateSimulatorVisuals(res.mockOutageActive);
      }
    } catch (e) {
      // ignore
    }
  },

  updateSimulatorVisuals: (isOutage) => {
    const card = document.getElementById('simulator-card');
    const badge = document.getElementById('simulator-state-badge');
    if (!card || !badge) return;

    if (isOutage) {
      card.classList.remove('normal');
      badge.textContent = 'FAILING (503 OUTAGE)';
      badge.className = 'status-pill status-down';
    } else {
      card.classList.add('normal');
      badge.textContent = 'HEALTHY (200 OK)';
      badge.className = 'status-pill status-healthy';
    }
  },

  loadDiagnostics: async () => {
    try {
      const res = await api.health.system();
      const pre = document.getElementById('diagnostics-system-json');
      if (pre) {
        pre.textContent = JSON.stringify(res, null, 2);
      }
    } catch (e) {
      console.error('Error loading diagnostics:', e);
    }
  },
};

// Modal close handler on click outside or close button
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close-btn')) {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('active'));
  }
});

window.App = App;

// Bootstrap on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
