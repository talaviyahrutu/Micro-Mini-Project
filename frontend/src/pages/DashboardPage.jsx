import React, { useState, useEffect } from 'react';
import { dashboardService, apiService, incidentService } from '../services/api';
import StatCard from '../components/StatCard';
import IncidentModal from '../components/IncidentModal';
import HistoryModal from '../components/HistoryModal';
import { 
  Server, 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  Percent, 
  RefreshCw, 
  Play, 
  ExternalLink,
  Flame,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedHistoryApi, setSelectedHistoryApi] = useState(null);
  const [probingId, setProbingId] = useState(null);

  const loadDashboard = async () => {
    try {
      const [statsRes, apisRes] = await Promise.all([
        dashboardService.getStats(),
        apiService.getAll({ limit: 10 }),
      ]);
      setStats(statsRes.data);
      setApis(apisRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // Auto refresh every 10 seconds to show live probe activity
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async (apiId) => {
    setProbingId(apiId);
    try {
      await apiService.checkNow(apiId);
      await loadDashboard();
    } catch (err) {
      alert('Manual check probe failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setProbingId(null);
    }
  };

  const handleStatusUpdate = async (incidentId, data) => {
    await incidentService.updateStatus(incidentId, data);
    await loadDashboard();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 1rem', display: 'block' }} />
        <p>Loading Sentinel Telemetry...</p>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const recentIncidents = stats?.recentIncidents || [];
  const openIncidents = recentIncidents.filter((i) => i.status !== 'resolved');

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            System Health & Telemetry Command
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Continuous endpoint monitoring, automated failure detection, and incident resolution.
          </p>
        </div>

        <button
          onClick={() => { setRefreshing(true); loadDashboard(); }}
          disabled={refreshing}
          className="btn btn-outline btn-sm"
          id="btn-refresh-dashboard"
        >
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Outage / Critical Banner if any active incidents */}
      {openIncidents.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'pulseGlow 2s infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700 }}>
                {openIncidents.length} Active System Incident{openIncidents.length > 1 ? 's' : ''} Detected
              </h4>
              <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                Latest: {openIncidents[0].title}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('incidents')}
            className="btn btn-danger btn-sm"
          >
            Review Incidents ➔
          </button>
        </div>
      )}

      {/* KPI Stats Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Endpoints"
          value={summary.totalApis || 0}
          subtext="Configured target APIs"
          icon={Server}
          color="cyan"
        />
        <StatCard
          title="Healthy APIs"
          value={summary.healthyApis || 0}
          subtext={`${summary.totalApis ? Math.round((summary.healthyApis / summary.totalApis) * 100) : 100}% operational`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Unhealthy APIs"
          value={summary.unhealthyApis || 0}
          subtext="Failing response checks"
          icon={AlertOctagon}
          color="red"
        />
        <StatCard
          title="Open Incidents"
          value={summary.openIncidents || 0}
          subtext={`${summary.criticalIncidents || 0} critical severity`}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Avg Latency"
          value={summary.avgResponseTime ? `${summary.avgResponseTime}ms` : '--'}
          subtext="Across all probes"
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="System Uptime"
          value={summary.overallUptime !== undefined ? `${summary.overallUptime}%` : '100%'}
          subtext="Cumulative availability"
          icon={Percent}
          color="green"
        />
      </div>

      {/* Active Monitored APIs Table */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Monitored API Fleet Status
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time health status and on-demand diagnostic probe execution.
            </span>
          </div>

          <button
            onClick={() => onNavigate('apis')}
            className="btn btn-outline btn-sm"
          >
            Manage Fleet ➔
          </button>
        </div>

        <div className="table-container">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Method & URL</th>
                <th>Health Status</th>
                <th>Last Latency</th>
                <th>Uptime</th>
                <th>Last Probe</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apis.map((api) => (
                <tr key={api._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{api.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Every {api.interval}s • Timeout {api.timeout}ms
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`method-badge ${api.method}`}>{api.method}</span>
                      <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {api.url}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${api.currentStatus || 'pending'}`}>
                      <span className={`status-dot ${api.currentStatus || 'pending'}`} />
                      {api.currentStatus || 'pending'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: (api.lastResponseTime > 400) ? 'var(--status-warning)' : 'var(--accent-cyan)' }}>
                      {api.lastResponseTime !== null ? `${api.lastResponseTime}ms` : '--'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {api.uptimePercentage}%
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {api.lastCheckedAt ? new Date(api.lastCheckedAt).toLocaleTimeString() : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleManualCheck(api._id)}
                        disabled={probingId === api._id}
                        className="btn btn-outline btn-sm"
                        title="Execute on-demand manual probe"
                      >
                        <Play size={12} className={probingId === api._id ? 'spinning' : ''} />
                        {probingId === api._id ? 'Probing...' : 'Probe'}
                      </button>
                      <button
                        onClick={() => setSelectedHistoryApi(api)}
                        className="btn btn-outline btn-sm"
                        title="View latency history and sparkline"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Command & Live Telemetry Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Incidents Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Incident Command Activity
            </h3>
            <button onClick={() => onNavigate('incidents')} className="btn btn-outline btn-sm">
              View All ➔
            </button>
          </div>

          {recentIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
              <ShieldCheck size={32} style={{ color: 'var(--status-healthy)', margin: '0 auto 0.5rem', display: 'block' }} />
              All monitored endpoints healthy. No incidents recorded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentIncidents.map((incident) => (
                <div
                  key={incident._id}
                  onClick={() => setSelectedIncident(incident)}
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className={`severity-badge ${incident.severity}`}>
                      {incident.severity}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: incident.status === 'resolved' ? 'var(--status-healthy)' : 'var(--status-danger)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {incident.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '0.2rem' }}>
                    {incident.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Started {new Date(incident.startTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Probes Feed Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
            Live Background Probes Feed
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
            {stats?.recentChecks && stats.recentChecks.length > 0 ? (
              stats.recentChecks.map((check) => (
                <div
                  key={check._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className={`status-dot ${check.status === 'healthy' ? 'healthy' : 'unhealthy'}`} />
                    <span style={{ fontWeight: 600, color: '#fff' }}>{check.api?.name || 'Endpoint'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      HTTP {check.statusCode || 'ERR'}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {check.responseTime}ms
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {new Date(check.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem' }}>No recent probes recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Incident Modal */}
      <IncidentModal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        incident={selectedIncident}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* History & Sparkline Modal */}
      <HistoryModal
        isOpen={!!selectedHistoryApi}
        onClose={() => setSelectedHistoryApi(null)}
        api={selectedHistoryApi}
      />
    </div>
  );
}
