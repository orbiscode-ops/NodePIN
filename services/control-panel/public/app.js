// Helper to safely set input values without throwing null pointer errors
function setElementValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

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
  setElementValue('server-input-name', '');
  setElementValue('server-input-ip', '');
  setElementValue('server-input-ssh-port', '22');
  setElementValue('server-input-ssh-user', 'root');
  setElementValue('server-input-ssh-key', '');
  
  // Reset the mask checkbox to checked
  const checkbox = document.getElementById('toggle-ssh-key-mask');
  if (checkbox) checkbox.checked = true;
  toggleKeyMask(true);

  // Reset legacy element IDs to prevent any caching errors
  setElementValue('server-input-key', '');
  setElementValue('server-input-ips', '');

  const overlay = document.getElementById('modal-add-server');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
  }
}

function hideAddServerModal() {
  const overlay = document.getElementById('modal-add-server');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.style.display = 'none', 200);
  }
}

// ── Custom Modal: Add IP Handlers ────────────────────
function openAddIpModal(primaryIp) {
  setElementValue('add-ip-server-primary-ip', primaryIp);
  setElementValue('add-ip-input-val', '');
  const overlay = document.getElementById('modal-add-ip');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
  }
}

function hideAddIpModal() {
  const overlay = document.getElementById('modal-add-ip');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.style.display = 'none', 200);
  }
}

function submitAddIp() {
  const primaryIpEl = document.getElementById('add-ip-server-primary-ip');
  const newIpEl = document.getElementById('add-ip-input-val');
  
  const primaryIp = primaryIpEl ? primaryIpEl.value : '';
  const newIp = newIpEl ? newIpEl.value.trim() : '';

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
  if (ipSelect) {
    ipSelect.innerHTML = '';
    const ips = activeServer.ips || [activeServer.ip];
    ips.forEach(ip => {
      const opt = document.createElement('option');
      opt.value = ip;
      opt.textContent = ip;
      ipSelect.appendChild(opt);
    });
  }

  // Reset launch fields
  setElementValue('node-input-moniker', '');
  setElementValue('node-input-wallet-mode', 'auto');
  
  const mField = document.getElementById('node-field-mnemonic');
  if (mField) mField.style.display = 'none';
  setElementValue('node-input-mnemonic', '');

  autoFillMoniker();

  const overlay = document.getElementById('modal-launch-node');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
  }
}

function hideLaunchNodeModal() {
  const overlay = document.getElementById('modal-launch-node');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.style.display = 'none', 200);
  }
}

function toggleMnemonicField(val) {
  const mField = document.getElementById('node-field-mnemonic');
  if (mField) {
    mField.style.display = val === 'recover' ? 'block' : 'none';
  }
}

function autoFillMoniker() {
  const typeEl = document.getElementById('node-input-type');
  const type = typeEl ? typeEl.value : 'wireguard';
  
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

  setElementValue('node-input-moniker', moniker);
}

// ── Custom Modal: Wallet Generated Success ───
function showWalletSuccessModal(address, mnemonic) {
  setElementValue('success-wallet-address', address);
  
  const mGroup = document.getElementById('success-mnemonic-group');
  if (mnemonic) {
    if (mGroup) mGroup.style.display = 'block';
    setElementValue('success-wallet-mnemonic', mnemonic);
  } else {
    if (mGroup) mGroup.style.display = 'none';
  }
  const overlay = document.getElementById('modal-wallet-success');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
  }
}

function hideWalletSuccessModal() {
  const overlay = document.getElementById('modal-wallet-success');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.style.display = 'none', 200);
  }
}

// ── Server CRUD Operations ───────────────────────────
function submitAddServer() {
  const nameEl = document.getElementById('server-input-name');
  const ipEl = document.getElementById('server-input-ip');
  const portEl = document.getElementById('server-input-ssh-port');
  const userEl = document.getElementById('server-input-ssh-user');
  const keyEl = document.getElementById('server-input-ssh-key') || document.getElementById('server-input-key');

  const name = nameEl ? nameEl.value.trim() : '';
  const ip = ipEl ? ipEl.value.trim() : '';
  const port = portEl ? portEl.value.trim() : '22';
  const user = userEl ? userEl.value.trim() : 'root';
  const key = keyEl ? keyEl.value.trim() : '';

  if (!name || !ip || !user || !key) {
    alert('الرجاء إدخال اسم الخادم، الـ IP، اسم المستخدم وكلمة المرور/مفتاح SSH');
    return;
  }

  const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
  if (servers.find(s => s.ip === ip)) {
    alert('هذا السيرفر مضاف بالفعل.');
    return;
  }

  servers.push({
    name,
    ip,
    ips: [ip],
    sshPort: port || '22',
    sshUser: user || 'root',
    key: key
  });
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
  if (!body) return;
  
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
  const typeEl = document.getElementById('node-input-type');
  const ipEl = document.getElementById('node-input-ip');
  const monikerEl = document.getElementById('node-input-moniker');
  const modeEl = document.getElementById('node-input-wallet-mode');
  const mnemonicEl = document.getElementById('node-input-mnemonic');

  const type = typeEl ? typeEl.value : '';
  const ip = ipEl ? ipEl.value : '';
  const moniker = monikerEl ? monikerEl.value.trim() : '';
  const mode = modeEl ? modeEl.value : 'auto';
  const mnemonic = mnemonicEl ? mnemonicEl.value.trim() : '';

  if (!moniker) return alert('الرجاء إدخال اسم النود (Moniker)');
  if (mode === 'recover' && !mnemonic) return alert('الرجاء إدخال كلمات الاسترداد');

  const btn = document.getElementById('btn-submit-node');
  const oldText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = 'جاري إطلاق الحاوية… <span class="spinner"></span>';
    btn.disabled = true;
  }

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
    if (btn) {
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
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
  setElementValue('setting-moniker', localStorage.getItem('setting_moniker') || '{hostname}-{type}');
  setElementValue('setting-master-ip', localStorage.getItem('master_ip') || '');
  setElementValue('setting-master-port', localStorage.getItem('master_port') || '3000');
  setElementValue('setting-master-key', localStorage.getItem('master_key') || '');
}

function saveGlobalSettings() {
  const monikerEl = document.getElementById('setting-moniker');
  const masterIpEl = document.getElementById('setting-master-ip');
  const masterPortEl = document.getElementById('setting-master-port');
  const masterKeyEl = document.getElementById('setting-master-key');

  if (monikerEl) localStorage.setItem('setting_moniker', monikerEl.value);
  if (masterIpEl) localStorage.setItem('master_ip', masterIpEl.value.trim());
  if (masterPortEl) localStorage.setItem('master_port', masterPortEl.value.trim() || '3000');
  if (masterKeyEl) localStorage.setItem('master_key', masterKeyEl.value.trim());

  alert('تم حفظ الإعدادات بنجاح!');
}

// ── API Fetch Wrapper ────────────────────────────────
async function apiFetch(url, options = {}) {
  options.headers = options.headers || {};

  // 1. Inject master server coordinates for the Cloudflare Worker proxy
  const masterIp = localStorage.getItem('master_ip');
  const masterPort = localStorage.getItem('master_port') || '3000';
  const masterKey = localStorage.getItem('master_key');

  if (masterIp) {
    options.headers['x-master-host'] = masterIp;
    options.headers['x-master-port'] = masterPort;
  }
  if (masterKey) {
    options.headers['x-api-key'] = masterKey;
  }

  // 2. Inject target VPS SSH credentials for the active server
  const activeServer = localStorage.getItem('nodepin_active_server');
  if (activeServer) {
    const servers = JSON.parse(localStorage.getItem('nodepin_servers') || '[]');
    const active = servers.find(s => s.ip === activeServer);
    if (active) {
      options.headers['x-ssh-host'] = active.ip;
      options.headers['x-ssh-port'] = active.sshPort || '22';
      options.headers['x-ssh-user'] = active.sshUser || 'root';
      // Base64 encode key to safely transport in HTTP headers
      if (active.key) {
        try {
          options.headers['x-ssh-key'] = btoa(unescape(encodeURIComponent(active.key)));
        } catch (e) {
          options.headers['x-ssh-key'] = btoa(active.key);
        }
      }
    }
  }

  const res = await fetch(url, options);
  if (res.status === 401) {
    alert('⚠️ فشل التحقق من هوية الاتصال. يرجى التحقق من إعدادات سيرفر التحكم المركزي وبيانات SSH.');
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
  const launchBtn = document.getElementById('btn-launch-node');
  
  if (servers.length > 0) {
    select.style.display = 'inline-block';
    if (launchBtn) launchBtn.style.display = 'inline-flex';
  } else {
    select.style.display = 'none';
    if (launchBtn) launchBtn.style.display = 'none';
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
    const logBtn = document.getElementById('logout-btn');
    if (!h && logBtn) logBtn.style.display = 'inline-flex';
  }
}

// ── containers ────────────────────────────────────────
async function loadContainers() {
  const el = document.getElementById('containers');
  if (!el) return;
  try {
    const res = await apiFetch('/api/containers');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const cs = data.containers || [];

    // update summary
    const sTotal = document.getElementById('s-total');
    const sRunning = document.getElementById('s-running');
    const sStopped = document.getElementById('s-stopped');
    if (sTotal) sTotal.textContent = cs.length;
    if (sRunning) sRunning.textContent = cs.filter(c=>c.state==='running').length;
    if (sStopped) sStopped.textContent = cs.filter(c=>c.state!=='running').length;

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
  if (!el) return;
  try {
    const res = await apiFetch('/api/metrics');
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const entries = Object.entries(data.nodes || {});

    const sNet = document.getElementById('s-networks');
    if (sNet) sNet.textContent = entries.length;

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

  const lastUp = document.getElementById('last-update');
  if (lastUp) lastUp.textContent = 'آخر تحديث: ' + ts();
  
  const server = getActiveServer();
  const sTotal = document.getElementById('s-total');
  const sRunning = document.getElementById('s-running');
  const sStopped = document.getElementById('s-stopped');
  const sNet = document.getElementById('s-networks');

  if (!server) {
    if (sTotal) sTotal.textContent = '0';
    if (sRunning) sRunning.textContent = '0';
    if (sStopped) sStopped.textContent = '0';
    if (sNet) sNet.textContent = '0';
    
    const cont = document.getElementById('containers');
    if (cont) cont.innerHTML = '<div class="placeholder">⚠️ لا توجد خوادم مضافة حالياً. يرجى إضافة خادمك الأول من تبويب "إدارة الخوادم" لبدء العمل.</div>';
    
    const metr = document.getElementById('metrics');
    if (metr) metr.innerHTML = '<div class="placeholder">لا توجد شبكات مفعّلة حالياً.</div>';
    return;
  }
  await Promise.all([loadContainers(), loadMetrics()]);
}

// ── Initialization ────────────────────────────────────
checkAuth();
loadServersList();
handleRoute();
setInterval(refreshAll, 30_000);

// ── Password Mask Visibility Toggle ───────────────────
function toggleKeyMask(checked) {
  const el = document.getElementById('server-input-ssh-key');
  if (el) {
    el.style.webkitTextSecurity = checked ? 'disc' : 'none';
  }
}
