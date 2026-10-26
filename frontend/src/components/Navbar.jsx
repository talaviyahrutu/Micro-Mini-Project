import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockService } from '../services/api';
import { 
  Shield, 
  Activity, 
  Server, 
  AlertTriangle, 
  BarChart3, 
  LogOut, 
  Flame, 
  CheckCircle2,
  UserCheck
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onRefresh }) {
  const { user, logout } = useAuth();
  const [outageActive, setOutageActive] = useState(false);
  const [togglingOutage, setTogglingOutage] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await mockService.getStatus();
        if (res.outageState) {
          setOutageActive(
            res.outageState.paymentGatewayDown || 
            res.outageState.authServiceDegraded || 
            res.outageState.orderServiceDown
          );
        }
      } catch (e) {
        // Mock service might be idle
      }
    };
    fetchStatus();
  }, []);

  const handleToggleOutage = async () => {
    setTogglingOutage(true);
    try {
      const nextState = !outageActive;
      await mockService.toggleOutage('payment', nextState);
      setOutageActive(nextState);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Could not toggle mock outage: ' + err.message);
    } finally {
      setTogglingOutage(false);
    }
  };

  return (
    <header className="navbar">
      <a href="#" onClick={() => setActiveTab('dashboard')} className="nav-brand">
        <div className="brand-icon">
          <Shield size={20} strokeWidth={2.5} />
        </div>
        <span>API <strong style={{ color: 'var(--accent-cyan)' }}>SENTINEL</strong></span>
      </a>

      <nav className="nav-links">
        <button 
          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          id="nav-dashboard"
        >
          <Activity size={16} /> Dashboard
        </button>
        <button 
          className={`nav-link ${activeTab === 'apis' ? 'active' : ''}`}
          onClick={() => setActiveTab('apis')}
          id="nav-apis"
        >
          <Server size={16} /> APIs
        </button>
        <button 
          className={`nav-link ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
          id="nav-incidents"
        >
          <AlertTriangle size={16} /> Incidents
        </button>
        <button 
          className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          id="nav-analytics"
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </nav>

      <div className="nav-actions">
        {/* Live Outage Simulator Toggle Button */}
        <button 
          className={`outage-toggle-btn ${outageActive ? 'active' : ''}`}
          onClick={handleToggleOutage}
          disabled={togglingOutage}
          title="Click to simulate an outage on mock microservices to test incident automation"
          id="toggle-outage-btn"
        >
          <Flame size={15} />
          {outageActive ? 'Outage Active (503)' : 'Simulate Outage'}
        </button>

        {user && (
          <div className="user-pill">
            <UserCheck size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>{user.name.split(' ')[0]}</span>
            <span className="role-badge">{user.role}</span>
          </div>
        )}

        <button 
          className="btn btn-outline btn-sm" 
          onClick={logout}
          title="Sign out of Sentinel"
          id="btn-logout"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  );
}
