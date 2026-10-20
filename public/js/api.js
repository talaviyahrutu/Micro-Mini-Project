/**
 * API Sentinel — Centralized API Client & Toast System
 */

const API_BASE = '/api';

// Toast Notifications
const showToast = (message, type = 'info', duration = 4000) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Request wrapper with JWT Bearer Token
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('sentinel_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || (data.details && data.details[0]?.message) || `HTTP Error ${res.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
};

const api = {
  // Auth
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
    getUsers: () => request('/auth/users'),
  },

  // Monitors
  monitors: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/monitors?${q}`);
    },
    get: (id) => request(`/monitors/${id}`),
    create: (payload) => request('/monitors', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/monitors/${id}`, { method: 'PUT', body: payload }),
    delete: (id) => request(`/monitors/${id}`, { method: 'DELETE' }),
    ping: (id) => request(`/monitors/${id}/ping`, { method: 'POST' }),
    pingAll: () => request('/monitors/ping-all', { method: 'POST' }),
  },

  // Incidents
  incidents: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/incidents?${q}`);
    },
    get: (id) => request(`/incidents/${id}`),
    create: (payload) => request('/incidents', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/incidents/${id}`, { method: 'PUT', body: payload }),
    addTimeline: (id, note, action) => request(`/incidents/${id}/timeline`, { method: 'POST', body: { note, action } }),
    acknowledge: (id) => request(`/incidents/${id}/acknowledge`, { method: 'POST' }),
    resolve: (id, rootCause, resolutionNotes) =>
      request(`/incidents/${id}/resolve`, { method: 'POST', body: { rootCause, resolutionNotes } }),
    delete: (id) => request(`/incidents/${id}`, { method: 'DELETE' }),
  },

  // Health Checks & Telemetry
  health: {
    logs: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/health-checks?${q}`);
    },
    stats: () => request('/health-checks/stats'),
    system: () => request('/health-checks/system'),
  },

  // Alert Rules
  alerts: {
    list: () => request('/alerts'),
    create: (payload) => request('/alerts', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/alerts/${id}`, { method: 'PUT', body: payload }),
    toggle: (id) => request(`/alerts/${id}/toggle`, { method: 'PATCH' }),
    delete: (id) => request(`/alerts/${id}`, { method: 'DELETE' }),
  },

  // Mock Target Endpoints & Outage Simulator
  mock: {
    getOutageStatus: () => request('/mock/outage-status'),
    toggleOutage: (active) => request('/mock/toggle-outage', { method: 'POST', body: { active } }),
  },
};

window.api = api;
window.showToast = showToast;
