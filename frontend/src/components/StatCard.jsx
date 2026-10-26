import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'cyan' }) {
  return (
    <div className={`glass-card stat-card ${color}`}>
      <div className="stat-header">
        <span>{title}</span>
        <div className="stat-icon" style={{ color: `var(--accent-${color === 'cyan' ? 'cyan' : color})` }}>
          {Icon && <Icon size={18} />}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
