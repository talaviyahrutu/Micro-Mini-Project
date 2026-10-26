import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';

export default function ApiModal({ isOpen, onClose, onSave, api = null }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    expectedStatusCode: 200,
    interval: 30,
    timeout: 5000,
    enabled: true,
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (api) {
      setFormData({
        name: api.name || '',
        url: api.url || '',
        method: api.method || 'GET',
        expectedStatusCode: api.expectedStatusCode || 200,
        interval: api.interval || 30,
        timeout: api.timeout || 5000,
        enabled: api.enabled !== undefined ? api.enabled : true,
      });
    } else {
      setFormData({
        name: '',
        url: '',
        method: 'GET',
        expectedStatusCode: 200,
        interval: 30,
        timeout: 5000,
        enabled: true,
      });
    }
    setError('');
  }, [api, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      return setError('Please provide an API Name.');
    }
    if (!formData.url.trim() || !formData.url.startsWith('http')) {
      return setError('A valid URL starting with http:// or https:// is required.');
    }

    setSubmitting(true);
    try {
      await onSave(formData, api ? api._id : null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const setPreset = (presetName, presetUrl, interval = 30) => {
    setFormData((prev) => ({
      ...prev,
      name: presetName,
      url: presetUrl,
      interval,
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {api ? 'Edit Monitored API' : 'Register New API Endpoint'}
          </h3>
          <button onClick={onClose} className="btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {!api && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Quick Presets:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setPreset('Mock Payment Gateway', 'http://localhost:5000/api/mock/payment-gateway', 15)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + Payment Mock
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('GitHub Status API', 'https://www.githubstatus.com/api/v2/status.json', 60)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + GitHub Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreset('Cloudflare 1.1.1.1', 'https://1.1.1.1', 60)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + Cloudflare
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">API Service Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Stripe Payment Gateway"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                id="api-name-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Endpoint URL *</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://api.example.com/health"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
                id="api-url-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">HTTP Method</label>
                <select
                  className="form-select"
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  id="api-method-select"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Status Code</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.expectedStatusCode}
                  onChange={(e) => setFormData({ ...formData, expectedStatusCode: parseInt(e.target.value, 10) || 200 })}
                  id="api-expected-status-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Monitoring Interval (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="86400"
                  className="form-input"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value, 10) || 30 })}
                  id="api-interval-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Timeout (ms)</label>
                <input
                  type="number"
                  min="500"
                  max="60000"
                  className="form-input"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value, 10) || 5000 })}
                  id="api-timeout-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="api-enabled-checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="api-enabled-checkbox" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                Enable Active Background Monitoring
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary" id="btn-save-api">
              {api ? <Save size={15} /> : <Plus size={15} />}
              {submitting ? 'Saving...' : api ? 'Update API' : 'Register API'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
