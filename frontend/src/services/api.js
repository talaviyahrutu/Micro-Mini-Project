import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle authentication expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear token and notify
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const apiService = {
  getAll: async (params) => {
    const res = await api.get('/apis', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/apis/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/apis', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/apis/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/apis/${id}`);
    return res.data;
  },
  checkNow: async (id) => {
    const res = await api.post(`/apis/${id}/check`);
    return res.data;
  },
  getHistory: async (id, params) => {
    const res = await api.get(`/apis/${id}/history`, { params });
    return res.data;
  },
};

export const incidentService = {
  getAll: async (params) => {
    const res = await api.get('/incidents', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },
  updateStatus: async (id, data) => {
    const res = await api.put(`/incidents/${id}/status`, data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/incidents/${id}`, data);
    return res.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export const mockService = {
  toggleOutage: async (service, down) => {
    const res = await api.post('/mock/toggle-outage', { service, down });
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/mock/status');
    return res.data;
  },
};

export default api;
