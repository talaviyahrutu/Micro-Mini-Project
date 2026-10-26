import React, { useState } from 'react';
import { X, CheckCircle, Clock, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

export default function IncidentModal({ isOpen, onClose, incident, onStatusUpdate }) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !incident) return null;

  const currentStatus = incident.status;

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStatus && !note && !rootCause) return;

    setUpdating(true);
    try {
      await onStatusUpdate(incident._id, {
        status: selectedStatus || currentStatus,
        note: note || `Status updated to ${selectedStatus || currentStatus}`,
        rootCause: rootCause || incident.rootCause,
      });
      setSelectedStatus('');
      setNote('');
      onClose();
    } catch (err) {
      alert('Error updating incident: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`status-dot unhealthy`} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Incident Details & Resolution Command
            </h3>
          </div>
          <button onClick={onClose} className="btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Header Info */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className={`severity-badge ${incident.severity}`}>
                {incident.severity} SEVERITY
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Started: {new Date(incident.startTime).toLocaleString()}
              </span>
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
              {incident.title}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {incident.description}
            </p>
          </div>

          {/* Root Cause Box */}
          {incident.rootCause && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '0.2rem' }}>
                Root Cause Analysis:
              </strong>
              <span style={{ color: 'var(--text-main)' }}>{incident.rootCause}</span>
            </div>
          )}

          {/* Timeline of events */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Incident Timeline & Activity Logs
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {incident.timeline && incident.timeline.length > 0 ? (
                incident.timeline.map((entry, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${entry.status === 'resolved' ? 'var(--status-healthy)' : 'var(--accent-cyan)'}`,
                  }}>
                    <Clock size={16} style={{ color: 'var(--text-dim)', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: entry.status === 'resolved' ? 'var(--status-healthy)' : 'var(--accent-cyan)' }}>
                          {entry.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>{entry.note}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No timeline entries recorded.</p>
              )}
            </div>
          </div>

          {/* Transition Status Form */}
          {incident.status !== 'resolved' && (
            <form onSubmit={handleUpdate} style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                Advance Incident Lifecycle Status
              </h5>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                {['investigating', 'identified', 'monitoring', 'resolved'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s)}
                    className={`btn btn-sm ${selectedStatus === s ? 'btn-primary' : 'btn-outline'}`}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {s === 'resolved' ? '✓ Resolve Incident' : `➔ ${s}`}
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Triage Note / Activity Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Restarted pod, verified downstream payment database connection."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  id="incident-note-input"
                />
              </div>

              {selectedStatus === 'resolved' && (
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Root Cause Summary *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Upstream vendor payment endpoint timeout due to DNS partition."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    required
                    id="incident-rootcause-input"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={updating || (!selectedStatus && !note)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: '0.5rem' }}
                id="btn-update-incident-status"
              >
                {updating ? 'Updating...' : 'Commit Status Transition'}
              </button>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
