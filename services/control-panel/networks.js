// ═══════════════════════════════════════════
// NodePIN — Custom Networks Registry
// Stores user-defined networks in /app/data/networks.json
// Each network entry contains everything needed to:
//   1. display it in the dashboard
//   2. fetch its earnings (local API / web API / link-only)
// ═══════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const DATA_DIR    = process.env.DATA_DIR || '/app/data';
const NETWORKS_FILE = path.join(DATA_DIR, 'networks.json');

// ── Earnings type constants ──────────────────────────────
// 'local'  → GET http://<localApiUrl>/  returns JSON with earnings field
// 'web'    → POST loginUrl → JWT → GET balanceUrl
// 'link'   → no API, just show a dashboard link
const EARN_TYPES = ['local', 'web', 'link'];

// ── Schema validation ────────────────────────────────────
function validate(net) {
  const errors = [];
  if (!net.key        || !/^[a-z0-9_-]+$/.test(net.key))  errors.push('key: حروف صغيرة وأرقام فقط');
  if (!net.name       || !net.name.trim())                 errors.push('name: مطلوب');
  if (!net.image      || !net.image.trim())                errors.push('image: Docker image مطلوب');
  if (!net.token      || !net.token.trim())                errors.push('token: العملة مطلوبة');
  if (!EARN_TYPES.includes(net.earnType))                  errors.push('earnType: local | web | link');
  if (net.earnType === 'link' && !net.dashboardUrl)        errors.push('dashboardUrl: مطلوب لنوع link');
  if (net.earnType === 'local' && !net.localApiUrl)        errors.push('localApiUrl: مطلوب لنوع local');
  if (net.earnType === 'web'   && (!net.loginUrl || !net.balanceUrl))
    errors.push('loginUrl + balanceUrl: مطلوبان لنوع web');
  if (!Array.isArray(net.credentials))                     errors.push('credentials: يجب أن تكون مصفوفة');
  return errors;
}

// ── Read / write helpers ─────────────────────────────────
function readAll() {
  try {
    if (!fs.existsSync(NETWORKS_FILE)) return [];
    return JSON.parse(fs.readFileSync(NETWORKS_FILE, 'utf8'));
  } catch { return []; }
}

function writeAll(list) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(NETWORKS_FILE, JSON.stringify(list, null, 2), { mode: 0o600 });
}

// ── CRUD ────────────────────────────────────────────────

/** List all custom networks */
function list() {
  return readAll();
}

/** Get one custom network by key */
function get(key) {
  return readAll().find(n => n.key === key) || null;
}

/** Add a new network. Returns { ok, error } */
function add(net) {
  const errors = validate(net);
  if (errors.length) return { ok: false, error: errors.join(' | ') };

  const all = readAll();
  if (all.some(n => n.key === net.key)) return { ok: false, error: `الشبكة "${net.key}" موجودة بالفعل` };

  const entry = {
    key:          net.key.toLowerCase().trim(),
    name:         net.name.trim(),
    icon:         net.icon || '🌐',
    image:        net.image.trim(),
    token:        net.token.trim().toUpperCase(),
    earnType:     net.earnType,          // 'local' | 'web' | 'link'
    localApiUrl:  net.localApiUrl  || null,
    loginUrl:     net.loginUrl     || null,
    balanceUrl:   net.balanceUrl   || null,
    // path inside the JSON response that holds the earnings number
    earningsPath: net.earningsPath || null,
    dashboardUrl: net.dashboardUrl || null,
    credentials:  (net.credentials || []).map(c => ({
      key:   c.key.trim().toUpperCase(),
      label: c.label.trim(),
      type:  c.type || 'text',        // text | email | password
    })),
    enabled:      net.enabled !== false,
    createdAt:    new Date().toISOString(),
  };

  all.push(entry);
  writeAll(all);
  return { ok: true, network: entry };
}

/** Update an existing network */
function update(key, patch) {
  const all = readAll();
  const idx = all.findIndex(n => n.key === key);
  if (idx === -1) return { ok: false, error: 'الشبكة غير موجودة' };

  const merged = { ...all[idx], ...patch, key }; // key cannot change
  const errors = validate(merged);
  if (errors.length) return { ok: false, error: errors.join(' | ') };

  all[idx] = { ...merged, updatedAt: new Date().toISOString() };
  writeAll(all);
  return { ok: true, network: all[idx] };
}

/** Remove a network by key */
function remove(key) {
  const all = readAll();
  const next = all.filter(n => n.key !== key);
  if (next.length === all.length) return { ok: false, error: 'الشبكة غير موجودة' };
  writeAll(next);
  return { ok: true };
}

/** Toggle enabled flag */
function setEnabled(key, enabled) {
  return update(key, { enabled });
}

module.exports = { list, get, add, update, remove, setEnabled, EARN_TYPES };
