/**
 * API Sentinel — Authentication & Role Manager
 */

const Auth = {
  currentUser: null,

  init: async () => {
    const token = localStorage.getItem('sentinel_token');
    if (!token) {
      // Default to guest / pre-seed admin login for quick evaluation ease
      await Auth.quickLogin('admin');
      return;
    }

    try {
      const res = await api.auth.me();
      Auth.currentUser = res.data;
      Auth.updateUi();
    } catch (e) {
      console.warn('Stored token is invalid, falling back to admin demo session.');
      await Auth.quickLogin('admin');
    }
  },

  quickLogin: async (roleType) => {
    const credentials = {
      admin: { email: 'admin@apisentinel.dev', password: 'Admin@123' },
      analyst: { email: 'analyst@apisentinel.dev', password: 'User@123' },
      viewer: { email: 'viewer@apisentinel.dev', password: 'Viewer@123' },
    };

    const cred = credentials[roleType] || credentials.admin;
    try {
      const res = await api.auth.login(cred.email, cred.password);
      localStorage.setItem('sentinel_token', res.data.token);
      Auth.currentUser = res.data.user;
      Auth.updateUi();
      showToast(`Switched active session to ${Auth.currentUser.name} (${Auth.currentUser.role.toUpperCase()})`, 'success');
      if (window.Monitors) window.Monitors.loadMonitors();
      if (window.Incidents) window.Incidents.loadIncidents();
    } catch (e) {
      showToast(`Login failed: ${e.message}`, 'error');
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('sentinel_token', res.data.token);
      Auth.currentUser = res.data.user;
      Auth.updateUi();
      showToast(`Welcome back, ${Auth.currentUser.name}!`, 'success');
      document.getElementById('auth-modal').classList.remove('active');
      if (window.Monitors) window.Monitors.loadMonitors();
      if (window.Incidents) window.Incidents.loadIncidents();
    } catch (e) {
      showToast(`Login failed: ${e.message}`, 'error');
    }
  },

  register: async (payload) => {
    try {
      const res = await api.auth.register(payload);
      localStorage.setItem('sentinel_token', res.data.token);
      Auth.currentUser = res.data.user;
      Auth.updateUi();
      showToast(`Account registered successfully as ${Auth.currentUser.role}!`, 'success');
      document.getElementById('auth-modal').classList.remove('active');
    } catch (e) {
      showToast(`Registration failed: ${e.message}`, 'error');
    }
  },

  logout: () => {
    localStorage.removeItem('sentinel_token');
    Auth.currentUser = null;
    Auth.updateUi();
    showToast('Logged out of Sentinel session.', 'info');
    if (window.Monitors) window.Monitors.loadMonitors();
  },

  updateUi: () => {
    const userBadge = document.getElementById('user-profile-badge');
    const userNameEl = document.getElementById('user-name-text');
    const userRoleEl = document.getElementById('user-role-pill');
    const userAvatarEl = document.getElementById('user-avatar-circle');

    if (Auth.currentUser) {
      userNameEl.textContent = Auth.currentUser.name;
      userRoleEl.textContent = Auth.currentUser.role.toUpperCase();
      userAvatarEl.textContent = Auth.currentUser.name.charAt(0);

      // Adjust role styling
      if (Auth.currentUser.role === 'admin') {
        userRoleEl.style.color = 'var(--status-down)';
        userRoleEl.textContent = 'ADMIN (FULL ACCESS)';
      } else if (Auth.currentUser.role === 'analyst') {
        userRoleEl.style.color = 'var(--accent-cyan)';
        userRoleEl.textContent = 'ANALYST / SRE';
      } else {
        userRoleEl.style.color = 'var(--text-muted)';
        userRoleEl.textContent = 'VIEWER';
      }
    } else {
      userNameEl.textContent = 'Guest Session';
      userRoleEl.textContent = 'READ ONLY';
      userAvatarEl.textContent = '?';
    }

    // Role-based element visibility
    const isAdmin = Auth.currentUser && Auth.currentUser.role === 'admin';
    const isAnalystOrAdmin = Auth.currentUser && ['admin', 'analyst'].includes(Auth.currentUser.role);

    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = isAdmin ? '' : 'none';
    });

    document.querySelectorAll('.analyst-admin-only').forEach((el) => {
      el.style.display = isAnalystOrAdmin ? '' : 'none';
    });
  },
};

window.Auth = Auth;
