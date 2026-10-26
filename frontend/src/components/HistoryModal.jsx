import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { apiService } from '../services/api';

export default function HistoryModal({ isOpen, onClose, api }) {
  const [history, setHistory] = useState([]);
  const [sparkline, setSparkline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && api) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await apiService.getHistory(api._id, { limit: 25 });
          setHistory(res.history || []);
          setSparkline(res.sparkline || []);
        } catch (err) {
          console.error('Failed to load health history:', err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, api]);

  if (!isOpen || !api) return null;

  // Compute max response time for sparkline scaling
  const maxLatency = Math.max(...sparkline.map((s) => s.responseTime || 0), 200);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`method-badge ${api.method}`}>{api.method}</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{api.name}</h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} className="font-mono">
              {api.url}
            </span>
          </div>
          <button onClick={onClose} className="btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Stats Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>CURRENT STATUS</span>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', textTransform: 'uppercase', color: api.currentStatus === 'healthy' ? 'var(--status-healthy)' : 'var(--status-danger)' }}>
                {api.currentStatus}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>UPTIME</span>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#fff' }}>
                {api.uptimePercentage}%
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>LAST LATENCY</span>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--accent-cyan)' }}>
                {api.lastResponseTime ? `${api.lastResponseTime}ms` : '--'}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>CHECKS COUNT</span>
              <div style={{ fontWeight: 700, marginTop: '0.2rem', color: '#fff' }}>
                {api.totalChecks || 0}
              </div>
            </div>
          </div>

          {/* Real-time Latency Sparkline Graph */}
          <div style={{
            background: 'rgba(11, 16, 26, 0.8)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                Recent Latency Sparkline Trend (Last {sparkline.length} Probes)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Scale Peak: {maxLatency}ms
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', paddingBottom: '4px', borderBottom: '1px dashed var(--border-color)' }}>
              {sparkline.map((item, idx) => {
                const heightPercent = Math.max(Math.min((item.responseTime / maxLatency) * 100, 100), 8);
                const isErr = item.status !== 'healthy';
                return (
                  <div
                    key={idx}
                    title={`${item.responseTime}ms (${item.status} - ${item.statusCode || 'ERR'})`}
                    style={{
                      flex: 1,
                      height: `${heightPercent}%`,
                      background: isErr ? 'var(--status-danger)' : 'var(--accent-cyan)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      transition: 'height 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Historical Health Check Records Table */}
          <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
            Probe Telemetry Logs
          </h5>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem' }}>Loading health history...</p>
          ) : (
            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="sentinel-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>HTTP Code</th>
                    <th>Response Time</th>
                    <th>Error Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className={`status-pill ${h.status === 'healthy' ? 'healthy' : 'unhealthy'}`} style={{ fontSize: '0.7rem' }}>
                          <span className={`status-dot ${h.status === 'healthy' ? 'healthy' : 'unhealthy'}`} />
                          {h.status}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.85rem' }}>
                        {h.statusCode || '--'}
                      </td>
                      <td style={{ fontWeight: 600, color: h.responseTime > 500 ? 'var(--status-warning)' : 'var(--accent-cyan)' }}>
                        {h.responseTime}ms
                      </td>
                      <td style={{ fontSize: '0.75rem', color: h.errorMessage ? 'var(--status-danger)' : 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.errorMessage || 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
