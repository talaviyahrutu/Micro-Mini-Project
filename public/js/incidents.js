/**
 * API Sentinel — Incident Command Center Controller
 */

const Incidents = {
  allIncidents: [],
  currentFilter: {
    status: '',
    severity: '',
    search: '',
  },

  init: () => {
    const searchInput = document.getElementById('incident-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        Incidents.currentFilter.search = e.target.value.trim();
        Incidents.loadIncidents();
      });
    }

    const statusFilter = document.getElementById('incident-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        Incidents.currentFilter.status = e.target.value;
        Incidents.loadIncidents();
      });
    }

    const severityFilter = document.getElementById('incident-severity-filter');
    if (severityFilter) {
      severityFilter.addEventListener('change', (e) => {
        Incidents.currentFilter.severity = e.target.value;
        Incidents.loadIncidents();
      });
    }

    const incidentForm = document.getElementById('incident-form');
    if (incidentForm) {
      incidentForm.addEventListener('submit', Incidents.handleFormSubmit);
    }

    const resolveForm = document.getElementById('resolve-modal-form');
    if (resolveForm) {
      resolveForm.addEventListener('submit', Incidents.handleResolveSubmit);
    }

    const timelineForm = document.getElementById('timeline-modal-form');
    if (timelineForm) {
      timelineForm.addEventListener('submit', Incidents.handleTimelineSubmit);
    }
  },

  loadIncidents: async () => {
    try {
      const res = await api.incidents.list(Incidents.currentFilter);
      Incidents.allIncidents = res.data;

      // Update Header KPI
      if (res.summary) {
        document.getElementById('kpi-active-incidents').textContent = res.summary.active;
        document.getElementById('tab-incidents-counter').textContent = res.summary.active;
      }

      Incidents.renderList(res.data);
    } catch (e) {
      console.error('Error loading incidents:', e);
    }
  },

  renderList: (incidents) => {
    const container = document.getElementById('incidents-container');
    if (!container) return;

    if (!incidents || incidents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>All Systems Nominal</h3>
          <p>No active incidents or matching outage reports found.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = incidents
      .map((inc) => {
        const severityClass = `severity-${inc.severity}`;
        const statusClass = `status-${inc.status}`;
        const isResolved = inc.status === 'resolved';
        const isAdmin = window.Auth?.currentUser?.role === 'admin';
        const timeline = inc.timelineJson || [];

        return `
        <div class="incident-card ${severityClass} ${isResolved ? 'status-resolved' : ''}">
          <div class="incident-card-top">
            <div class="incident-meta-group">
              <span class="incident-code">${inc.incidentCode}</span>
              <span class="severity-pill ${severityClass}">${inc.severity}</span>
              <span class="status-pill ${statusClass}">${inc.status}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">
                Triggered: ${inc.triggeredBy.toUpperCase()}
              </span>
            </div>
            
            <div style="font-size: 0.8rem; color: var(--text-muted); font-family:var(--font-mono);">
              ${Charts.formatTimeAgo(inc.createdAt)}
            </div>
          </div>

          <div class="incident-body">
            <h3 class="incident-title">${inc.title}</h3>
            <p class="incident-desc">${inc.description || 'No detailed description provided.'}</p>
            ${
              inc.monitor
                ? `<div style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px;">
                     <span>Target Service:</span>
                     <span style="font-weight:600; color:var(--text-primary);">${inc.monitor.name}</span>
                     <span class="tag-env ${inc.monitor.environment}">${inc.monitor.environment}</span>
                   </div>`
                : ''
            }
            ${
              inc.rootCause
                ? `<div class="incident-cause-box">
                     <strong>Root Cause Analysis:</strong> ${inc.rootCause}
                     ${inc.resolutionNotes ? `<br><strong style="color:var(--status-healthy);">Resolution:</strong> ${inc.resolutionNotes}` : ''}
                   </div>`
                : ''
            }
          </div>

          <div style="margin-top: 6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">
                Incident Activity Timeline (${timeline.length})
              </span>
              <button class="btn btn-secondary btn-sm" onclick="Incidents.openTimelineModal(${inc.id})">
                + Add Update
              </button>
            </div>
            <div class="timeline-container">
              ${timeline
                .slice(-3)
                .map(
                  (t) => `
                <div class="timeline-entry">
                  <div class="timeline-time">${new Date(t.timestamp).toLocaleTimeString()} — <span class="timeline-author">${t.author || 'Sentinel'}</span></div>
                  <div class="timeline-note">${t.note}</div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="incident-card-footer">
            <div class="incident-assignee-text">
              Assigned Engineer: <strong>${inc.assignedTo ? inc.assignedTo.name : 'Unassigned'}</strong>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              ${
                !isResolved
                  ? `
                ${
                  inc.status === 'investigating'
                    ? `<button class="btn btn-secondary btn-sm" onclick="Incidents.acknowledge(${inc.id})">
                         👁️ Acknowledge
                       </button>`
                    : ''
                }
                <button class="btn btn-success btn-sm" onclick="Incidents.openResolveModal(${inc.id})">
                  ✓ Mark Resolved
                </button>
              `
                  : `<span style="font-size:0.82rem; color:var(--status-healthy); font-weight:600;">✓ Resolved ${Charts.formatTimeAgo(inc.resolvedAt)}</span>`
              }
              ${
                isAdmin
                  ? `<button class="btn btn-danger btn-sm" onclick="Incidents.deleteIncident(${inc.id})" title="Delete Incident">Delete</button>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  openReportModal: async () => {
    document.getElementById('incident-form').reset();
    // Populate monitor dropdown
    const select = document.getElementById('incident-monitor-select');
    select.innerHTML = `<option value="">-- No specific service (Global Outage) --</option>`;
    if (window.Monitors && window.Monitors.allMonitors) {
      window.Monitors.allMonitors.forEach((m) => {
        select.innerHTML += `<option value="${m.id}">${m.name} (${m.environment})</option>`;
      });
    }
    document.getElementById('incident-modal').classList.add('active');
  },

  handleFormSubmit: async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('incident-title').value.trim(),
      description: document.getElementById('incident-desc').value.trim(),
      severity: document.getElementById('incident-severity').value,
      monitorId: document.getElementById('incident-monitor-select').value || null,
    };

    try {
      await api.incidents.create(payload);
      showToast('Incident reported successfully and alert dispatched!', 'success');
      document.getElementById('incident-modal').classList.remove('active');
      await Incidents.loadIncidents();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  },

  acknowledge: async (id) => {
    try {
      await api.incidents.acknowledge(id);
      showToast('Incident acknowledged and assigned to your session.', 'success');
      await Incidents.loadIncidents();
    } catch (e) {
      showToast(`Acknowledge failed: ${e.message}`, 'error');
    }
  },

  openResolveModal: (id) => {
    document.getElementById('resolve-incident-id').value = id;
    document.getElementById('resolve-root-cause').value = '';
    document.getElementById('resolve-notes').value = '';
    document.getElementById('resolve-modal').classList.add('active');
  },

  handleResolveSubmit: async (e) => {
    e.preventDefault();
    const id = document.getElementById('resolve-incident-id').value;
    const rootCause = document.getElementById('resolve-root-cause').value.trim();
    const notes = document.getElementById('resolve-notes').value.trim();

    try {
      await api.incidents.resolve(id, rootCause, notes);
      showToast('Incident resolved and root cause documented!', 'success');
      document.getElementById('resolve-modal').classList.remove('active');
      await Incidents.loadIncidents();
    } catch (err) {
      showToast(`Resolution error: ${err.message}`, 'error');
    }
  },

  openTimelineModal: (id) => {
    document.getElementById('timeline-incident-id').value = id;
    document.getElementById('timeline-note-text').value = '';
    document.getElementById('timeline-modal').classList.add('active');
  },

  handleTimelineSubmit: async (e) => {
    e.preventDefault();
    const id = document.getElementById('timeline-incident-id').value;
    const note = document.getElementById('timeline-note-text').value.trim();

    try {
      await api.incidents.addTimeline(id, note, 'NOTE_ADDED');
      showToast('Timeline note logged.', 'success');
      document.getElementById('timeline-modal').classList.remove('active');
      await Incidents.loadIncidents();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  },

  deleteIncident: async (id) => {
    if (!confirm('Are you sure you want to permanently delete this incident record?')) return;

    try {
      await api.incidents.delete(id);
      showToast('Incident record deleted.', 'info');
      await Incidents.loadIncidents();
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  },
};

window.Incidents = Incidents;
