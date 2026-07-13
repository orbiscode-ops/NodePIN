/**
 * NodePIN — Dashboard Frontend
 * Professional Sentinel Management UI
 */

(function () {
  'use strict';

  // ── State ──
  let sessionToken = localStorage.getItem('nodepin_token') || null;
  let currentView = 'overview';

  // ── API Helper ──
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionToken) headers['x-session-token'] = sessionToken;

    const res = await fetch(`/api${path}`, { ...options, headers });

    if (res.status === 401) {
      sessionToken = null;
      localStorage.removeItem('nodepin_token');
      showScreen('login');
      throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ── Screen Management ──
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(`${name}-screen`);
    if (screen) screen.classList.add('active');
  }

  // ── View Management ──
  function showView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${name}`);
    if (view) view.classList.add('active');

    const nav = document.querySelector(`[data-view="${name}"]`);
    if (nav) nav.classList.add('active');

    // Load data for the view
    if (name === 'overview') loadDashboard();
    if (name === 'servers') loadServers();
    if (name === 'nodes') loadNodes();
  }

  // ══════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════

  async function checkAuth() {
    try {
      const health = await api('/health');
      if (health.setupRequired) {
        document.getElementById('setup-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
      }
      if (sessionToken) {
        showScreen('dashboard');
        showView('overview');
      }
    } catch {
      showScreen('login');
    }
  }

  // Setup Form
  document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('setup-password').value;
    const confirm = document.getElementById('setup-confirm').value;

    if (password !== confirm) {
      toast('Passwords do not match', 'error');
      return;
    }

    try {
      await api('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      toast('Dashboard configured! Please sign in.', 'success');
      document.getElementById('setup-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // Login Form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      sessionToken = data.token;
      localStorage.setItem('nodepin_token', data.token);
      errorEl.classList.add('hidden');
      showScreen('dashboard');
      showView('overview');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    sessionToken = null;
    localStorage.removeItem('nodepin_token');
    showScreen('login');
  });

  // Change Password
  document.getElementById('btn-change-password').addEventListener('click', () => {
    openModal('Change Password', `
      <form id="change-password-form">
        <div class="form-group">
          <label>Current Password</label>
          <input type="password" id="cp-current" required>
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input type="password" id="cp-new" minlength="8" required>
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input type="password" id="cp-confirm" minlength="8" required>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Update Password</button>
      </form>
    `);

    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('cp-current').value;
      const newPassword = document.getElementById('cp-new').value;
      const confirm = document.getElementById('cp-confirm').value;

      if (newPassword !== confirm) {
        toast('Passwords do not match', 'error');
        return;
      }

      try {
        await api('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        toast('Password updated successfully', 'success');
        closeModal();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  // ══════════════════════════════════════════
  // DASHBOARD OVERVIEW
  // ══════════════════════════════════════════

  async function loadDashboard() {
    try {
      const stats = await api('/dashboard');

      document.getElementById('stat-total-servers').textContent = stats.servers.total;
      document.getElementById('stat-online-servers').textContent = stats.servers.online;
      document.getElementById('stat-total-nodes').textContent = stats.nodes.total;
      document.getElementById('stat-running-nodes').textContent = stats.nodes.running;

      const breakdown = document.getElementById('protocol-breakdown');
      if (stats.byProtocol.length === 0) {
        breakdown.innerHTML = '<div class="empty-state"><p>No nodes configured yet</p></div>';
      } else {
        breakdown.innerHTML = stats.byProtocol.map(p => `
          <div class="protocol-card">
            <div class="protocol-name"><span class="protocol-badge ${p.protocol}">${p.protocol}</span></div>
            <div class="protocol-stats">${p.running} / ${p.count} running</div>
          </div>
        `).join('');
      }
    } catch (err) {
      toast('Failed to load dashboard: ' + err.message, 'error');
    }
  }

  document.getElementById('btn-refresh-dashboard').addEventListener('click', loadDashboard);

  // ══════════════════════════════════════════
  // SERVERS
  // ══════════════════════════════════════════

  async function loadServers() {
    const container = document.getElementById('servers-list');
    try {
      const { servers } = await api('/servers');

      if (servers.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#9881;</div>
            <p>No servers added yet. Click "Add Server" to get started.</p>
          </div>`;
        return;
      }

      container.innerHTML = servers.map(s => `
        <div class="card" data-id="${s.id}">
          <div class="card-header">
            <span class="card-title">${esc(s.name)}</span>
            <div class="card-actions">
              <button class="btn-icon" onclick="NodePIN.editServer('${s.id}')" title="Edit">&#9998;</button>
              <button class="btn-icon" onclick="NodePIN.checkServer('${s.id}')" title="Check Connection">&#8635;</button>
              <button class="btn-icon" onclick="NodePIN.deleteServer('${s.id}')" title="Delete">&#10005;</button>
            </div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="label">Host</span>
              <span class="value">${esc(s.host)}:${s.port}</span>
            </div>
            <div class="card-row">
              <span class="label">User</span>
              <span class="value">${esc(s.username)}</span>
            </div>
            <div class="card-row">
              <span class="label">Auth</span>
              <span class="value">${s.auth_type}</span>
            </div>
            <div class="card-row">
              <span class="label">Status</span>
              <span class="badge badge-${s.status}">${s.status}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
    }
  }

  // Add Server
  document.getElementById('btn-add-server').addEventListener('click', () => {
    openModal('Add Server', `
      <form id="add-server-form">
        <div class="form-group">
          <label>Server Name</label>
          <input type="text" id="srv-name" placeholder="e.g. VPS US-1" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Host (IP / Domain)</label>
            <input type="text" id="srv-host" placeholder="192.168.1.1" required>
          </div>
          <div class="form-group">
            <label>SSH Port</label>
            <input type="number" id="srv-port" value="22" min="1" max="65535">
          </div>
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="srv-username" value="root">
        </div>
        <div class="form-group">
          <label>Auth Type</label>
          <select id="srv-authtype">
            <option value="password">Password</option>
            <option value="key">SSH Key</option>
          </select>
        </div>
        <div class="form-group">
          <label id="srv-cred-label">Password</label>
          <textarea id="srv-credential" placeholder="Enter password or paste SSH private key" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Add Server</button>
      </form>
    `);

    // Toggle credential label based on auth type
    document.getElementById('srv-authtype').addEventListener('change', (e) => {
      const label = document.getElementById('srv-cred-label');
      const input = document.getElementById('srv-credential');
      if (e.target.value === 'key') {
        label.textContent = 'SSH Private Key';
        input.placeholder = '-----BEGIN OPENSSH PRIVATE KEY-----\n...';
      } else {
        label.textContent = 'Password';
        input.placeholder = 'Enter password';
      }
    });

    document.getElementById('add-server-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/servers', {
          method: 'POST',
          body: JSON.stringify({
            name: document.getElementById('srv-name').value,
            host: document.getElementById('srv-host').value,
            port: parseInt(document.getElementById('srv-port').value),
            username: document.getElementById('srv-username').value,
            authType: document.getElementById('srv-authtype').value,
            credential: document.getElementById('srv-credential').value
          })
        });
        toast('Server added successfully', 'success');
        closeModal();
        loadServers();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  // ══════════════════════════════════════════
  // NODES
  // ══════════════════════════════════════════

  async function loadNodes() {
    const container = document.getElementById('nodes-list');
    const filterSelect = document.getElementById('filter-server');

    try {
      // Load servers for filter dropdown
      const { servers } = await api('/servers');
      filterSelect.innerHTML = '<option value="">All Servers</option>' +
        servers.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');

      const serverId = filterSelect.value;
      const { nodes } = await api(`/nodes${serverId ? '?server_id=' + serverId : ''}`);

      if (nodes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#9678;</div>
            <p>No nodes configured. Click "Add Node" to create one.</p>
          </div>`;
        return;
      }

      container.innerHTML = nodes.map(n => `
        <div class="card" data-id="${n.id}">
          <div class="card-header">
            <div>
              <span class="card-title">${esc(n.name)}</span>
              <span class="protocol-badge ${n.protocol}">${n.protocol}</span>
            </div>
            <div class="card-actions">
              <button class="btn-icon" onclick="NodePIN.controlNode('${n.id}', 'restart')" title="Restart">&#8635;</button>
              <button class="btn-icon" onclick="NodePIN.deleteNode('${n.id}')" title="Delete">&#10005;</button>
            </div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span class="label">Server</span>
              <span class="value">${esc(n.server_name || 'N/A')}</span>
            </div>
            ${n.ip_address ? `<div class="card-row"><span class="label">IP</span><span class="value">${esc(n.ip_address)}</span></div>` : ''}
            ${n.port ? `<div class="card-row"><span class="label">Port</span><span class="value">${n.port}</span></div>` : ''}
            <div class="card-row">
              <span class="label">Status</span>
              <span class="badge badge-${n.status}">${n.status}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Error: ${esc(err.message)}</p></div>`;
    }
  }

  document.getElementById('filter-server').addEventListener('change', loadNodes);

  // Add Node
  document.getElementById('btn-add-node').addEventListener('click', async () => {
    const { servers } = await api('/servers');

    if (servers.length === 0) {
      toast('Add a server first before adding nodes', 'error');
      return;
    }

    openModal('Add Sentinel Node', `
      <form id="add-node-form">
        <div class="form-group">
          <label>Node Name</label>
          <input type="text" id="node-name" placeholder="e.g. Sentinel US-1" required>
        </div>
        <div class="form-group">
          <label>Server</label>
          <select id="node-server" required>
            ${servers.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.host)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Protocol</label>
          <select id="node-protocol" required>
            <option value="v2ray">V2Ray</option>
            <option value="wireguard">WireGuard</option>
            <option value="openvpn">OpenVPN</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Port (optional)</label>
            <input type="number" id="node-port" placeholder="Auto">
          </div>
          <div class="form-group">
            <label>IP Address (optional)</label>
            <input type="text" id="node-ip" placeholder="Node public IP">
          </div>
        </div>
        <div class="form-group">
          <label>Config Path (optional)</label>
          <input type="text" id="node-config" placeholder="/etc/v2ray/config.json">
        </div>
        <button type="submit" class="btn btn-primary btn-full">Add Node</button>
      </form>
    `);

    document.getElementById('add-node-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/nodes', {
          method: 'POST',
          body: JSON.stringify({
            serverId: document.getElementById('node-server').value,
            name: document.getElementById('node-name').value,
            protocol: document.getElementById('node-protocol').value,
            port: document.getElementById('node-port').value ? parseInt(document.getElementById('node-port').value) : null,
            ipAddress: document.getElementById('node-ip').value || null,
            configPath: document.getElementById('node-config').value || null
          })
        });
        toast('Node added successfully', 'success');
        closeModal();
        loadNodes();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  // ══════════════════════════════════════════
  // MODAL
  // ══════════════════════════════════════════

  function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ══════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ══════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ══════════════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════════════

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showView(item.dataset.view);
    });
  });

  // ══════════════════════════════════════════
  // GLOBAL API (for inline onclick handlers)
  // ══════════════════════════════════════════

  window.NodePIN = {
    async deleteServer(id) {
      if (!confirm('Delete this server and all its nodes?')) return;
      try {
        await api(`/servers/${id}`, { method: 'DELETE' });
        toast('Server deleted', 'success');
        loadServers();
      } catch (err) { toast(err.message, 'error'); }
    },

    async checkServer(id) {
      try {
        toast('Checking connection...', 'info');
        const { status } = await api(`/servers/${id}/check`, { method: 'POST' });
        toast(`Server is ${status}`, status === 'online' ? 'success' : 'error');
        loadServers();
      } catch (err) { toast(err.message, 'error'); }
    },

    editServer(id) {
      // TODO: Implement edit server modal
      toast('Edit server coming soon', 'info');
    },

    async deleteNode(id) {
      if (!confirm('Delete this node?')) return;
      try {
        await api(`/nodes/${id}`, { method: 'DELETE' });
        toast('Node deleted', 'success');
        loadNodes();
      } catch (err) { toast(err.message, 'error'); }
    },

    async controlNode(id, action) {
      try {
        toast(`${action}ing node...`, 'info');
        const result = await api(`/nodes/${id}/control`, {
          method: 'POST',
          body: JSON.stringify({ action })
        });
        toast(result.success ? `${action} successful` : `${action} failed`, result.success ? 'success' : 'error');
        loadNodes();
      } catch (err) { toast(err.message, 'error'); }
    }
  };

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════

  checkAuth();
})();
