/**
 * API Sentinel — High-Performance SVG Sparklines & Visual Charts
 */

const Charts = {
  // Generate an inline SVG Sparkline from an array of latencies or health check objects
  generateSparklineSvg: (dataPoints, status = 'healthy', width = 300, height = 36) => {
    if (!dataPoints || dataPoints.length === 0) {
      return `<div style="font-size:0.75rem; color:var(--text-muted); padding:8px 0;">No telemetry data recorded</div>`;
    }

    const values = dataPoints.map((d) => (typeof d === 'number' ? d : d.responseTimeMs || 0));
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 100);
    const range = maxVal - minVal || 1;

    const padding = 4;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const step = innerWidth / (values.length - 1 || 1);

    const points = values.map((val, idx) => {
      const x = padding + idx * step;
      const normalized = (val - minVal) / range;
      const y = padding + innerHeight - normalized * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    let strokeColor = '#10B981';
    let gradientId = `grad_${Math.random().toString(36).substr(2, 9)}`;

    if (status === 'degraded') {
      strokeColor = '#F59E0B';
    } else if (status === 'down') {
      strokeColor = '#EF4444';
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: ${height}px; overflow: visible;">
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.3" />
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#${gradientId})" />
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  },

  // Latency status tag helper
  formatLatency: (ms) => {
    if (ms === null || ms === undefined || ms === 0) return '-- ms';
    return `${ms}ms`;
  },

  // Format date relative or ISO
  formatTimeAgo: (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString();
  },
};

window.Charts = Charts;
