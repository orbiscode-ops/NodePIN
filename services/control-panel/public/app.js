// ── Routing Handler ──────────────────────────────────
function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  
  // Hide all views
  document.querySelectorAll('.view-container').forEach(el => el.style.display = 'none');
  
  // Show active view
  const activeView = document.querySelector(hash);
  if (activeView) activeView.style.display = 'block';
  
  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('href') === hash);
  });

  // Refresh if going to dashboard
  if (hash === '#dashboard') {
    refreshAll();
  } else if (hash === '#servers') {
    renderServersTable();
  } else if (hash === '#settings') {
    loadSettingsInputs();
  }
}
window.addEventListener('hashchange', handleRoute);

// ── Custom Modal: Add Server Handlers ────────────────
function openAddServerModal() {
  document.getElementById('server-input-name').value = '';
  document.getElementById('server-input-ip').value = '';
  document.getElementById('server-input-key').value = '';
  const overlay = document.getElementById('modal-add-server');
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

function hideAddServerModal() {
  const overlay = document.getElementById('modal-add-server');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 200);
}

// ── Custom Modal: Add IP Handlers ────────────────────
function openAddIpModal(primaryIp) {
  document.getElementById('add-ip-server-primary-ip').value = primaryIp;
  document.getElementById('add-ip-input-val').value = '';
  const overlay = document.getElementById('modal-add-ip');
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

function hideAddIpModal() {
  const overlay = document.getElementById('modal-add-ip');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 200);
}

function submitAddIp() {
  const primaryIp = document.getElementById('add-ip-server-primary-ip').value;
  const newIp = document.getElementById('add-ip-input-val').value.trim();

  if (!newIp) return alert('الرجاء إدخال عنوان الـ IP الجديد');

  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  const server = servers.find(s => s.ip === primaryIp);
  
  if (server) {
    server.ips = server.ips || [server.ip];
    if (server.ips.includes(newIp)) {
      alert('هذا الـ IP مضاف بالفعل لهذا السيرفر.');
      return;
    }
    server.ips.push(newIp);
    localStorage.setItem('nodepin_servers', JSON.stringify(servers));
    hideAddIpModal();
    renderServersTable();
  }
}

// ── Custom Modal: Launch Node Handlers ───────────────
function openLaunchNodeModal() {
  const activeIp = getActiveServer();
  if (!activeIp) return alert('الرجاء اختيار سيرفر نشط أولاً.');

  // Populate dynamic IPs dropdown
  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  const activeServer = servers.find(s => s.ip === activeIp);
  if (!activeServer) return alert('خطأ في استرجاع بيانات الخادم النشط.');

  const ipSelect = document.getElementById('node-input-ip');
  ipSelect.innerHTML = '';
  
  const ips = activeServer.ips || [activeServer.ip];
  ips.forEach(ip => {
    const opt = document.createElement('option');
    opt.value = ip;
    opt.textContent = ip;
    ipSelect.appendChild(opt);
  });

  // Reset launch fields
  document.getElementById('node-input-moniker').value = '';
  document.getElementById('node-input-wallet-mode').value = 'auto';
  document.getElementById('node-field-mnemonic').style.display = 'none';
  document.getElementById('node-input-mnemonic').value = '';

  autoFillMoniker();

  const overlay = document.getElementById('modal-launch-node');
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

function hideLaunchNodeModal() {
  const overlay = document.getElementById('modal-launch-node');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 200);
}

function toggleMnemonicField(val) {
  document.getElementById('node-field-mnemonic').style.display = val === 'recover' ? 'block' : 'none';
}

function autoFillMoniker() {
  const type = document.getElementById('node-input-type').value;
  const activeIp = getActiveServer();
  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  const activeServer = servers.find(s => s.ip === activeIp);
  const hostname = activeServer ? activeServer.name : 'node';

  let template = localStorage.getItem('setting_moniker') || '{hostname}-{type}';
  let moniker = template
    .replace('{hostname}', hostname)
    .replace('{type}', type === 'wireguard' ? 'wg' : type === 'v2ray' ? 'v2' : 'ovpn')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  document.getElementById('node-input-moniker').value = moniker;
}

// ── Custom Modal: Wallet Generated Success ───
function showWalletSuccessModal(address, mnemonic) {
  document.getElementById('success-wallet-address').value = address;
  if (mnemonic) {
    document.getElementById('success-mnemonic-group').style.display = 'block';
    document.getElementById('success-wallet-mnemonic').value = mnemonic;
  } else {
    document.getElementById('success-mnemonic-group').style.display = 'none';
  }
  const overlay = document.getElementById('modal-wallet-success');
  overlay.style.display = 'flex';
  setTimeout(() => overlay.classList.add('active'), 10);
}

function hideWalletSuccessModal() {
  const overlay = document.getElementById('modal-wallet-success');
  overlay.classList.remove('active');
  setTimeout(() => overlay.style.display = 'none', 200);
}

// ── Server CRUD Operations ───────────────────────────
function submitAddServer() {
  const name = document.getElementById('server-input-name').value.trim();
  const ip = document.getElementById('server-input-ip').value.trim();
  const key = document.getElementById('server-input-key').value.trim();

  if (!name || !ip || !key) {
    alert('الرجاء إدخال اسم الخادم، الـ IP، ومفتاح الأمان');
    return;
  }

  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  if (servers.find(s => s.ip === ip)) {
    alert('هذا السيرفر مضاف بالفعل.');
    return;
  }

  servers.push({ name, ip, ips: [ip], key: key });
  localStorage.setItem('nodepin_servers', JSON.stringify(servers));
  
  // Auto-activate server if it's the first
  if (servers.length === 1) {
    localStorage.setItem('nodepin_active_server', ip);
  }

  hideAddServerModal();
  loadServersList();
  renderServersTable();
  refreshAll();
}

function removeServer(primaryIp) {
  if (!confirm('هل أنت متأكد من حذف هذا الخادم؟')) return;
  
  let servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  servers = servers.filter(s => s.ip !== primaryIp);
  localStorage.setItem('nodepin_servers', JSON.stringify(servers));

  const active = localStorage.getItem('nodepin_active_server');
  if (active === primaryIp) {
    localStorage.removeItem('nodepin_active_server');
    if (servers.length > 0) {
      localStorage.setItem('nodepin_active_server', servers[0].ip);
    }
  }

  loadServersList();
  renderServersTable();
  refreshAll();
}

function renderServersTable() {
  const body = document.getElementById('servers-table-body');
  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');

  if (!servers.length) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="placeholder">لا توجد خوادم مضافة حالياً. اضغط على زر الإضافة لإعداد خادمك الأول.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = servers.map(s => {
    const isActive = localStorage.getItem('nodepin_active_server') === s.ip;
    const ipsList = s.ips ? s.ips.join(' , ') : s.ip;
    return `
      <tr>
        <td style="font-weight: 700;">${s.name} ${isActive ? '<span style="color:var(--accent); font-size:0.8rem; margin-right:0.5rem;">[النشط]</span>' : ''}</td>
        <td><code>${ipsList}</code></td>
        <td>
          <span class="badge ${isActive ? 'running' : 'stopped'}">${isActive ? 'نشط ومحدد' : 'متاح'}</span>
        </td>
        <td style="text-align:left; display:flex; justify-content:flex-end; gap:0.5rem;">
          <button class="btn btn-ghost btn-sm" onclick="openAddIpModal('${s.ip}')">+ إضافة IP</button>
          ${!isActive ? `<button class="btn btn-ghost btn-sm" onclick="selectServer('${s.ip}')">تحديد كنشط</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="removeServer('${s.ip}')">حذف</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Node Deploy & Remove Operations ──────────────────
async function submitLaunchNode() {
  const type = document.getElementById('node-input-type').value;
  const ip = document.getElementById('node-input-ip').value;
  const moniker = document.getElementById('node-input-moniker').value.trim();
  const mode = document.getElementById('node-input-wallet-mode').value;
  const mnemonic = document.getElementById('node-input-mnemonic').value.trim();

  if (!moniker) return alert('الرجاء إدخال اسم النود (Moniker)');
  if (mode === 'recover' && !mnemonic) return alert('الرجاء إدخال كلمات الاسترداد');

  const btn = document.getElementById('btn-submit-node');
  const oldText = btn.innerHTML;
  btn.innerHTML = 'جاري إطلاق الحاوية… <span class="spinner"></span>';
  btn.disabled = true;

  try {
    const res = await apiFetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moniker, ip, type, mode, mnemonic })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشلت عملية الإطلاق');

    hideLaunchNodeModal();
    
    // Show success wallet details
    const addr = data.wallet?.address || 'N/A';
    const mnem = data.wallet?.mnemonic || '';
    showWalletSuccessModal(addr, mnem);
    
    refreshAll();
  } catch (e) {
    alert('خطأ أثناء إطلاق النود: ' + e.message);
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

async function deleteNode(moniker) {
  if (!confirm(`هل أنت متأكد من إيقاف وحذف النود ${moniker} نهائياً؟ سيتم مسح الحاوية وسجلات البيانات.`)) return;

  try {
    const res = await apiFetch(`/api/nodes/${moniker}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل حذف النود');
    
    alert('تم إيقاف وحذف النود بنجاح!');
    refreshAll();
  } catch (e) {
    alert('خطأ أثناء الحذف: ' + e.message);
  }
}

// ── Global Settings Handlers ─────────────────────────
function loadSettingsInputs() {
  document.getElementById('setting-moniker').value = localStorage.getItem('setting_moniker') || '{hostname}-{type}';
}

function saveGlobalSettings() {
  localStorage.setItem('setting_moniker', document.getElementById('setting-moniker').value);
  alert('تم حفظ الإعدادات بنجاح!');
}

// ── API Fetch Wrapper ────────────────────────────────
async function apiFetch(url, options = {}) {
  const activeServer = localStorage.getItem('nodepin_active_server');
  if (activeServer) {
    options.headers = options.headers || {};
    options.headers['x-vps-host'] = activeServer;
    
    // Retrieve API key specifically for this active server
    const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
    const active = servers.find(s => s.ip === activeServer);
    if (active && active.key) {
      options.headers['x-api-key'] = active.key;
    }
  }
  const res = await fetch(url, options);
  if (res.status === 401) {
    alert('⚠️ رمز الأمان (API Key) الخاص بهذا الخادم غير صحيح أو غير متطابق. يرجى التحقق من إعدادات الخادم.');
    throw new Error('Unauthorized');
  }
  return res;
}

function getActiveServer() {
  return localStorage.getItem('nodepin_active_server');
}

function loadServersList() {
  const select = document.getElementById('server-select');
  if (!select) return;
  
  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  if (servers.length > 0) {
    select.style.display = 'inline-block';
    document.getElementById('btn-launch-node').style.display = 'inline-flex';
  } else {
    select.style.display = 'none';
    document.getElementById('btn-launch-node').style.display = 'none';
  }

  select.innerHTML = '<option value="">-- اختر خادماً --</option>';
  servers.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.ip;
    opt.textContent = `${s.name} (${s.ip})`;
    select.appendChild(opt);
  });
  const active = localStorage.getItem('nodepin_active_server');
  if (active) {
    select.value = active;
  }
}

function selectServer(ip) {
  localStorage.setItem('nodepin_active_server', ip);
  loadServersList();
  renderServersTable();
  refreshAll();
}

function badge(state) {
  const map = { running:'running', exited:'stopped', stopped:'stopped', starting:'starting', error:'error', ok:'running', no_identity:'stopped' };
  const cls = map[state] || 'stopped';
  const labels = { running:'يعمل', stopped:'متوقف', starting:'قيد الإقلاع', error:'خطأ', no_identity:'بدون هوية' };
  return `<span class="badge ${cls}">${labels[state] || state}</span>`;
}

function row(key, val) {
  if (val === null || val === undefined || val === '') return '';
  return `<div class="row"><span class="key">${key}</span><span class="val">${val}</span></div>`;
}

function fmt(n, unit='') {
  if (n === null || n === undefined) return '—';
  if (typeof n === 'number') return n.toLocaleString('en') + (unit ? ' ' + unit : '');
  return n;
}

// Format bytes helper
function fmtBytes(b) {
  if (!b) return '—';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0; let v = b;
  while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
  return v.toFixed(1) + ' ' + units[i];
}

function fmtEarnings(info) {
  if (info.earnings === null || info.earnings === undefined) return null;
  if (info.network === 'storj') return '$' + (info.earnings / 100).toFixed(2);
  return info.earnings + ' ' + (info.token || '');
}

function ts() { return new Date().toLocaleTimeString('ar-SA'); }

// ── logout ────────────────────────────────────────────
async function doLogout() {
  await apiFetch('/api/logout', { method:'POST' });
  location.reload();
}

// Check auth status to show/hide logout btn
async function checkAuth() {
  const r = await apiFetch('/api/health').catch(() => null);
  if (r && r.ok) {
    const h = r.headers.get('x-auth-disabled');
    if (!h) document.getElementById('logout-btn').style.display = 'inline-flex';
  }
}

// ── containers ────────────────────────────────────────
async function loadContainers() {
  const el = document.getElementById('containers');
  try {
    const res = await apiFetch('/api/containers');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const cs = data.containers || [];

    // update summary
    document.getElementById('s-total').textContent   = cs.length;
    document.getElementById('s-running').textContent = cs.filter(c=>c.state==='running').length;
    document.getElementById('s-stopped').textContent = cs.filter(c=>c.state!=='running').length;

    if (!cs.length) { el.innerHTML = '<div class="placeholder">لا توجد حاويات NodePIN مضافة على هذا الخادم.</div>'; return; }

    el.innerHTML = cs.map(c => `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${c.name}</div>
            <div class="card-subtitle">${c.image}</div>
          </div>
          ${badge(c.state)}
        </div>
        ${row('الحالة', c.status)}
        ${row('المنافذ', c.ports || '—')}
        
        <div style="margin-top: 1rem; text-align: left; border-top: 1px solid rgba(30, 58, 138, 0.1); padding-top: 0.75rem;">
          <button class="btn btn-danger btn-sm" onclick="deleteNode('${c.name.replace('nodepin_sentinel_', '')}')">حذف النود 🗑️</button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    el.innerHTML = `<div class="placeholder" style="color:var(--red)">⚠️ خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل الـ API في السيرفر وإعدادات الـ IP. (${e.message})</div>`;
  }
}

// ── metrics ───────────────────────────────────────────
async function loadMetrics() {
  const el = document.getElementById('metrics');
  try {
    const res = await apiFetch('/api/metrics');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const entries = Object.entries(data.nodes || {});

    document.getElementById('s-networks').textContent = entries.length;

    if (!entries.length) { el.innerHTML = '<div class="placeholder">لا توجد شبكات مفعّلة حالياً على هذا السيرفر.</div>'; return; }

    el.innerHTML = entries.map(([name, info]) => {
      const x = info.extra || {};
      const earned = fmtEarnings(info);
      let extraRows = '';

      if (name === 'mysterium') {
        const errorRow = x.message || x.error;
        extraRows = [
          row('المعرف (Identity)', x.identity),
          row('الاسم المستعار (Moniker)', x.moniker),
          row('المتصلين (Peers)', fmt(x.peers)),
          row('المستهلك (Transferred)', fmtBytes(x.transferred)),
          row('الرصيد (Balance)', x.balance),
          row('النسخة (Version)', x.version),
          errorRow ? `<div class="row" style="color:var(--red);font-weight:600">${errorRow}</div>` : ''
        ].join('');
      } else {
        extraRows = Object.entries(x)
          .filter(([,v]) => v !== null && v !== undefined && v !== '')
          .map(([k,v]) => row(k, v)).join('');
      }

      return `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${name.toUpperCase()}</div>
              <div class="card-subtitle">${info.token || '—'}</div>
            </div>
            ${badge(info.status)}
          </div>
          ${extraRows}
          ${earned ? `
            <div class="earnings-box">
              <span class="earn-label">إجمالي الأرباح</span>
              <span class="earn-value">${earned}</span>
            </div>` : ''}
        </div>
      `;
    }).join('');
  } catch(e) {
    el.innerHTML = `<div class="placeholder" style="color:var(--red)">⚠️ خطأ في الاتصال بالخادم لجلب بيانات النودات. (${e.message})</div>`;
  }
}

// ── main loop ─────────────────────────────────────────
async function refreshAll() {
  const activeTab = window.location.hash || '#dashboard';
  if (activeTab !== '#dashboard') return;

  document.getElementById('last-update').textContent = 'آخر تحديث: ' + ts();
  const server = getActiveServer();
  if (!server) {
    document.getElementById('s-total').textContent = '0';
    document.getElementById('s-running').textContent = '0';
    document.getElementById('s-stopped').textContent = '0';
    document.getElementById('s-networks').textContent = '0';
    document.getElementById('containers').innerHTML = '<div class="placeholder">⚠️ لا توجد خوادم مضافة حالياً. يرجى إضافة خادمك الأول من تبويب "إدارة الخوادم" لبدء العمل.</div>';
    document.getElementById('metrics').innerHTML = '<div class="placeholder">لا توجد شبكات مفعّلة حالياً.</div>';
    return;
  }
  await Promise.all([loadContainers(), loadMetrics()]);
}

// ── Initialization ────────────────────────────────────
checkAuth();
loadServersList();
handleRoute();
setInterval(refreshAll, 30_000);
