import React, { useState, useEffect } from 'react';
import { apiService, dashboardService } from '../services/api';
import { BarChart3, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AnalyticsPage() {
  const [apis, setApis] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apisRes, statsRes] = await Promise.all([
          apiService.getAll({ limit: 50 }),
          dashboardService.getStats(),
        ]);
        setApis(apisRes.data || []);
        setStats(statsRes.data || {});
      } catch (err) {
        console.error('Failed to load analytics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>Loading analytics telemetry...</p>;
  }

  const maxLatency = Math.max(...apis.map((a) => a.lastResponseTime || 0), 100);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
          Historical Telemetry & SLO Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Longitudinal availability performance, latency benchmarks, and failure distributions.
        </p>
      </div>

      {/* Latency Comparison Bars */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
          Endpoint Latency Benchmarking (ms)
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Comparative probe response times across all active monitored endpoints.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {apis.map((api) => {
            const latency = api.lastResponseTime || 0;
            const barWidthPercent = Math.max(Math.min((latency / maxLatency) * 100, 100), 5);
            const isHighLatency = latency > 300;

            return (
              <div key={api._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {api.name} <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({api.method})</span>
                  </span>
                  <span style={{ fontWeight: 700, color: isHighLatency ? 'var(--status-warning)' : 'var(--accent-cyan)' }}>
                    {latency}ms
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${barWidthPercent}%`,
                      height: '100%',
                      background: isHighLatency ? 'var(--status-warning)' : 'var(--accent-gradient)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Availability / Uptime Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
          Service Level Objectives (SLO) & Rolling Uptime
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Calculated availability percentage based on total recorded probe checks.
        </p>

        <div className="table-container">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Target Endpoint</th>
                <th>Total Probes</th>
                <th>Successful</th>
                <th>Failures</th>
                <th>Rolling Uptime</th>
              </tr>
            </thead>
            <tbody>
              {apis.map((api) => {
                const total = api.totalChecks || 0;
                const successful = api.successfulChecks || 0;
                const failures = Math.max(total - successful, 0);

                return (
                  <tr key={api._id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{api.name}</td>
                    <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {api.url}
                    </td>
                    <td>{total}</td>
                    <td style={{ color: 'var(--status-healthy)', fontWeight: 600 }}>{successful}</td>
                    <td style={{ color: failures > 0 ? 'var(--status-danger)' : 'var(--text-dim)', fontWeight: 600 }}>
                      {failures}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${api.uptimePercentage}%`,
                              height: '100%',
                              background: api.uptimePercentage >= 99 ? 'var(--status-healthy)' : 'var(--status-danger)',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, color: api.uptimePercentage >= 99 ? 'var(--status-healthy)' : 'var(--status-warning)' }}>
                          {api.uptimePercentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
