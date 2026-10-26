import React, { useState, useEffect } from 'react';
import { incidentService } from '../services/api';
import IncidentModal from '../components/IncidentModal';
import { 
  AlertTriangle, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ExternalLink,
  RefreshCw,
  Search
} from 'lucide-react';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchIncidents = async () => {
    try {
      const res = await incidentService.getAll({
        status: statusFilter,
        severity: severityFilter,
      });
      setIncidents(res.data || []);
    } catch (err) {
      console.error('Failed to load incidents:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter]);

  const handleStatusUpdate = async (incidentId, data) => {
    await incidentService.updateStatus(incidentId, data);
    await fetchIncidents();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            Incident Command & Resolution
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage automated outage alerts, coordinate investigations, and maintain incident audit logs.
          </p>
        </div>

        <button onClick={fetchIncidents} className="btn btn-outline btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            id="filter-incident-status"
          >
            <option value="all">All Lifecycles</option>
            <option value="open">Open (Unacknowledged)</option>
            <option value="investigating">Investigating</option>
            <option value="identified">Identified</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Severity:</span>
          <select
            className="form-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            id="filter-incident-severity"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </div>
      </div>

      {/* Incidents Table / Cards */}
      <div className="glass-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Loading incidents...</p>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--status-healthy)' }} />
            <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>Zero Incidents Matching Filter</h4>
            <p style={{ fontSize: '0.85rem' }}>
              All monitored endpoints are operating within normal SLO parameters.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Incident Title</th>
                  <th>Affected API</th>
                  <th>Severity</th>
                  <th>Lifecycle Status</th>
                  <th>Start Time</th>
                  <th>Resolution / Duration</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{incident.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {incident.description}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{incident.api?.name || 'Target API'}</div>
                      <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {incident.api?.url}
                      </div>
                    </td>
                    <td>
                      <span className={`severity-badge ${incident.severity}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: incident.status === 'resolved' ? 'var(--status-healthy)' : 'var(--status-danger)',
                      }}>
                        ● {incident.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(incident.startTime).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: incident.resolvedAt ? 'var(--status-healthy)' : 'var(--text-dim)' }}>
                      {incident.resolvedAt ? `Resolved (${new Date(incident.resolvedAt).toLocaleTimeString()})` : 'Ongoing Outage'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedIncident(incident)}
                        className="btn btn-outline btn-sm"
                        id={`btn-triage-${incident._id}`}
                      >
                        Triage & Logs ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <IncidentModal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        incident={selectedIncident}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}
