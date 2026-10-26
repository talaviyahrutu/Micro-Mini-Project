import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import ApiModal from '../components/ApiModal';
import HistoryModal from '../components/HistoryModal';
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Edit, 
  Trash2, 
  Activity, 
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function ApisPage() {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState(null);
  const [historyApi, setHistoryApi] = useState(null);
  const [probingId, setProbingId] = useState(null);

  const fetchApis = async () => {
    try {
      const res = await apiService.getAll({
        search,
        status: statusFilter,
      });
      setApis(res.data || []);
    } catch (err) {
      console.error('Failed to fetch APIs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, [search, statusFilter]);

  const handleSaveApi = async (formData, id) => {
    if (id) {
      await apiService.update(id, formData);
    } else {
      await apiService.create(formData);
    }
    await fetchApis();
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete '${name}' and all associated telemetry logs?`)) {
      try {
        await apiService.delete(id);
        await fetchApis();
      } catch (err) {
        alert('Failed to delete API: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleManualCheck = async (id) => {
    setProbingId(id);
    try {
      await apiService.checkNow(id);
      await fetchApis();
    } catch (err) {
      alert('Probe error: ' + (err.response?.data?.message || err.message));
    } finally {
      setProbingId(null);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
            API Fleet Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Register endpoints, configure probe intervals, and monitor health performance.
          </p>
        </div>

        <button
          onClick={() => { setEditingApi(null); setModalOpen(true); }}
          className="btn btn-primary"
          id="btn-add-api"
        >
          <Plus size={16} /> Register New API
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search APIs by name or endpoint URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            id="search-apis-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--text-dim)' }} />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            id="filter-status-select"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy Only</option>
            <option value="unhealthy">Unhealthy Only</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <button onClick={fetchApis} className="btn btn-outline btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* APIs Table */}
      <div className="glass-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Loading API fleet...</p>
        ) : apis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
            <Activity size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.5 }} />
            <h4 style={{ color: '#fff', marginBottom: '0.25rem' }}>No Monitored APIs Found</h4>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
              {search ? 'Try modifying your search query or filters.' : 'Register your first API endpoint to begin automated health checks.'}
            </p>
            <button
              onClick={() => { setEditingApi(null); setModalOpen(true); }}
              className="btn btn-primary btn-sm"
            >
              + Register API
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>API Name</th>
                  <th>Target Endpoint</th>
                  <th>Health Status</th>
                  <th>Expected Code</th>
                  <th>Interval / Timeout</th>
                  <th>Response Time</th>
                  <th>Uptime %</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apis.map((api) => (
                  <tr key={api._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{api.name}</div>
                      <div style={{ fontSize: '0.75rem', color: api.enabled ? 'var(--status-healthy)' : 'var(--text-dim)' }}>
                        {api.enabled ? '● Active Monitoring' : '○ Disabled'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`method-badge ${api.method}`}>{api.method}</span>
                        <a
                          href={api.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono"
                          style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          {api.url} <ExternalLink size={11} />
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${api.currentStatus || 'pending'}`}>
                        <span className={`status-dot ${api.currentStatus || 'pending'}`} />
                        {api.currentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.85rem' }}>
                      {api.expectedStatusCode || 200}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {api.interval}s / {api.timeout}ms
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: api.lastResponseTime > 400 ? 'var(--status-warning)' : 'var(--accent-cyan)' }}>
                        {api.lastResponseTime !== null ? `${api.lastResponseTime}ms` : '--'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: api.uptimePercentage >= 99 ? 'var(--status-healthy)' : 'var(--status-warning)' }}>
                      {api.uptimePercentage}%
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleManualCheck(api._id)}
                          disabled={probingId === api._id}
                          className="btn btn-outline btn-sm"
                          title="Trigger immediate health check"
                        >
                          <Play size={13} className={probingId === api._id ? 'spinning' : ''} />
                        </button>
                        <button
                          onClick={() => setHistoryApi(api)}
                          className="btn btn-outline btn-sm"
                          title="View probe history"
                        >
                          <Activity size={13} />
                        </button>
                        <button
                          onClick={() => { setEditingApi(api); setModalOpen(true); }}
                          className="btn btn-outline btn-sm"
                          title="Edit configuration"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(api._id, api.name)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#f87171' }}
                          title="Delete API"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ApiModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveApi}
        api={editingApi}
      />

      <HistoryModal
        isOpen={!!historyApi}
        onClose={() => setHistoryApi(null)}
        api={historyApi}
      />
    </div>
  );
}
