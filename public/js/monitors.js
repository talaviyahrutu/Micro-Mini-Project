/**
 * API Sentinel — Monitors Management Controller
 */

const Monitors = {
  allMonitors: [],
  currentFilter: {
    search: '',
    status: '',
    environment: '',
  },

  init: () => {
    // Search input
    const searchInput = document.getElementById('monitor-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        Monitors.currentFilter.search = e.target.value.trim();
        Monitors.loadMonitors();
      });
    }

    // Status filter
    const statusSelect = document.getElementById('monitor-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        Monitors.currentFilter.status = e.target.value;
        Monitors.loadMonitors();
      });
    }

    // Environment filter
    const envSelect = document.getElementById('monitor-env-filter');
    if (envSelect) {
      envSelect.addEventListener('change', (e) => {
        Monitors.currentFilter.environment = e.target.value;
        Monitors.loadMonitors();
      });
    }

    // Modal submit
    const monitorForm = document.getElementById('monitor-form');
    if (monitorForm) {
      monitorForm.addEventListener('submit', Monitors.handleFormSubmit);
    }
  },

  loadMonitors: async () => {
    try {
      const res = await api.monitors.list(Monitors.currentFilter);
      Monitors.allMonitors = res.data;

      // Update summary KPI counters
      if (res.summary) {
        document.getElementById('kpi-total-monitors').textContent = res.summary.total;
        document.getElementById('kpi-healthy-count').textContent = res.summary.healthy;
        document.getElementById('kpi-degraded-count').textContent = res.summary.degraded;
        document.getElementById('kpi-down-count').textContent = res.summary.down;
        document.getElementById('kpi-uptime-pct').textContent = `${res.summary.overallUptime}%`;
      }

      Monitors.renderGrid(res.data);
    } catch (e) {
      console.error('Error loading monitors:', e);
    }
  },

  renderGrid: (monitors) => {
    const grid = document.getElementById('monitors-grid');
    if (!grid) return;

    if (!monitors || monitors.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3>No matching monitored endpoints found</h3>
          <p>Create a new monitor endpoint or adjust filter parameters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = monitors
      .map((m) => {
        const methodClass = `method-${(m.method || 'GET').toLowerCase()}`;
        const envClass = (m.environment || 'production').toLowerCase();
        const statusClass = `status-${m.status || 'healthy'}`;
        const isAdmin = window.Auth?.currentUser?.role === 'admin';

        return `
        <div class="monitor-card" data-id="${m.id}">
          <div class="monitor-card-header">
            <div class="monitor-title-group">
              <div class="monitor-name">
                <span class="status-pill ${statusClass}">${m.status}</span>
                <span>${m.name}</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                <span class="method-badge ${methodClass}">${m.method}</span>
                <span class="tag-env ${envClass}">${m.environment}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">
                  Every ${m.intervalSeconds}s
                </span>
              </div>
            </div>
            
            <div style="text-align: right;">
              <span style="font-size: 0.95rem; font-weight: 700; color: ${m.uptimePercentage >= 99 ? 'var(--status-healthy)' : m.uptimePercentage >= 95 ? 'var(--status-degraded)' : 'var(--status-down)'}; font-family:var(--font-mono);">
                ${m.uptimePercentage.toFixed(1)}%
              </span>
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Uptime</div>
            </div>
          </div>

          <div class="monitor-url-row">
            <span class="monitor-url-text" title="${m.url}">${m.url}</span>
            <button class="copy-url-btn" title="Copy URL" onclick="Monitors.copyUrl('${m.url}')">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2"/>
              </svg>
            </button>
          </div>

          <div class="monitor-stats-row">
            <div class="stat-item">
              <span class="stat-title">Latency</span>
              <span class="stat-val">${m.lastResponseTime ? m.lastResponseTime + 'ms' : '--'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-title">Status Code</span>
              <span class="stat-val" style="color: ${m.lastStatusCode === 200 ? 'var(--status-healthy)' : m.lastStatusCode ? 'var(--status-down)' : 'var(--text-muted)'};">
                ${m.lastStatusCode || '--'}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-title">Last Checked</span>
              <span class="stat-val" style="font-size:0.85rem; font-weight:500;">
                ${Charts.formatTimeAgo(m.lastCheckedAt)}
              </span>
            </div>
          </div>

          <div class="monitor-sparkline-box">
            <div class="sparkline-header">
              <span>Telemetry Sparkline</span>
              <span>${m.consecutiveFailures > 0 ? `<b style="color:var(--status-down);">${m.consecutiveFailures} consecutive fails</b>` : 'Healthy pulse'}</span>
            </div>
            <div id="sparkline-${m.id}">
              ${Charts.generateSparklineSvg([m.lastResponseTime || 40, m.lastResponseTime || 45, m.lastResponseTime || 50], m.status)}
            </div>
          </div>

          <div class="monitor-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="Monitors.pingNow(${m.id}, this)">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Ping Now
            </button>

            <div class="card-action-group">
              <button class="btn btn-secondary btn-sm" onclick="Monitors.openEditModal(${m.id})" title="Edit Monitor">
                Edit
              </button>
              ${
                isAdmin
                  ? `<button class="btn btn-danger btn-sm" onclick="Monitors.deleteMonitor(${m.id})" title="Delete Monitor">Delete</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  copyUrl: (url) => {
    navigator.clipboard.writeText(url);
    showToast('Target URL copied to clipboard!', 'info');
  },

  pingNow: async (id, btnElement) => {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Pinging...`;
    btnElement.disabled = true;

    try {
      const res = await api.monitors.ping(id);
      showToast(`Pinged endpoint: ${res.data.status.toUpperCase()} (${res.data.responseTimeMs}ms, code ${res.data.statusCode})`, res.data.isSuccess ? 'success' : 'error');
      await Monitors.loadMonitors();
      if (window.App) window.App.loadTelemetryLogs();
    } catch (e) {
      showToast(`Ping failed: ${e.message}`, 'error');
    } finally {
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    }
  },

  openCreateModal: () => {
    document.getElementById('monitor-modal-title').textContent = 'Register Monitored Service';
    document.getElementById('monitor-id').value = '';
    document.getElementById('monitor-form').reset();
    document.getElementById('monitor-interval').value = '30';
    document.getElementById('monitor-timeout').value = '5000';
    document.getElementById('monitor-expected').value = '200';
    document.getElementById('monitor-modal').classList.add('active');
  },

  openEditModal: async (id) => {
    try {
      const res = await api.monitors.get(id);
      const m = res.data;
      document.getElementById('monitor-modal-title').textContent = `Edit Service: ${m.name}`;
      document.getElementById('monitor-id').value = m.id;
      document.getElementById('monitor-name').value = m.name;
      document.getElementById('monitor-url').value = m.url;
      document.getElementById('monitor-method').value = m.method || 'GET';
      document.getElementById('monitor-expected').value = m.expectedStatusCode || 200;
      document.getElementById('monitor-interval').value = m.intervalSeconds || 30;
      document.getElementById('monitor-timeout').value = m.timeoutMs || 5000;
      document.getElementById('monitor-env').value = m.environment || 'production';
      document.getElementById('monitor-desc').value = m.description || '';
      document.getElementById('monitor-modal').classList.add('active');
    } catch (e) {
      showToast(`Failed to load monitor: ${e.message}`, 'error');
    }
  },

  handleFormSubmit: async (e) => {
    e.preventDefault();
    const id = document.getElementById('monitor-id').value;
    const payload = {
      name: document.getElementById('monitor-name').value.trim(),
      url: document.getElementById('monitor-url').value.trim(),
      method: document.getElementById('monitor-method').value,
      expectedStatusCode: parseInt(document.getElementById('monitor-expected').value, 10),
      intervalSeconds: parseInt(document.getElementById('monitor-interval').value, 10),
      timeoutMs: parseInt(document.getElementById('monitor-timeout').value, 10),
      environment: document.getElementById('monitor-env').value,
      description: document.getElementById('monitor-desc').value.trim(),
    };

    try {
      if (id) {
        await api.monitors.update(id, payload);
        showToast(`Monitor '${payload.name}' updated successfully!`, 'success');
      } else {
        await api.monitors.create(payload);
        showToast(`Monitor '${payload.name}' registered & initial health check queued!`, 'success');
      }
      document.getElementById('monitor-modal').classList.remove('active');
      await Monitors.loadMonitors();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  },

  deleteMonitor: async (id) => {
    if (!confirm('Are you sure you want to delete this monitor? All associated health check telemetry and incident logs will be removed.')) {
      return;
    }

    try {
      await api.monitors.delete(id);
      showToast('Monitor deleted successfully.', 'info');
      await Monitors.loadMonitors();
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  },
};

window.Monitors = Monitors;
