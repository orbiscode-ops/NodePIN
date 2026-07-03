// ═══════════════════════════════════════════
// NodePIN — Setup Wizard backend
// Writes node configuration to a secure volume path (/app/data/nodepin.conf)
// Never writes to .env directly — config is stored in the persistent volume.
// ═══════════════════════════════════════════
const fs   = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DATA_DIR  = process.env.DATA_DIR || '/app/data';
const CONF_FILE = path.join(DATA_DIR, 'nodepin.conf');

// Supported networks and their required fields
const NETWORK_FIELDS = {
  mysterium: [
    { key: 'MYST_IDENTITY_PASSPHRASE', label: 'Mysterium Passphrase', type: 'password',
      hint: 'كلمة مرور لحماية هويتك — اختر أي كلمة وتذكّرها' },
  ],
  storj: [
    { key: 'STORJ_WALLET', label: 'Ethereum Wallet Address', type: 'text',
      hint: 'عنوان محفظة Ethereum لاستقبال مدفوعات STORJ',
      link: { label: 'أنشئ محفظة مجانية', url: 'https://metamask.io' } },
    { key: 'STORJ_EMAIL', label: 'البريد الإلكتروني', type: 'email',
      hint: 'البريد المسجّل على Storj' },
    { key: 'STORJ_STORAGE_SIZE', label: 'حجم التخزين', type: 'text',
      hint: 'مثال: 500GB أو 1TB', default: '500GB' },
  ],
  honeygain: [
    { key: 'HONEYGAIN_EMAIL', label: 'Honeygain Email', type: 'email',
      hint: 'البريد المسجّل على Honeygain',
      link: { label: 'سجّل في Honeygain', url: 'https://r.honeygain.me/nodepin' } },
    { key: 'HONEYGAIN_PASS', label: 'Honeygain Password', type: 'password',
      hint: 'كلمة مرور حساب Honeygain' },
  ],
  traffmonetizer: [
    { key: 'TRAFFMONETIZER_TOKEN', label: 'Traffmonetizer Token', type: 'text',
      hint: 'انسخ الـ Token من لوحة تحكم Traffmonetizer',
      link: { label: 'احصل على Token', url: 'https://traffmonetizer.com/dashboard' } },
  ],
  iproyal: [
    { key: 'IPROYAL_EMAIL', label: 'IPRoyal Email', type: 'email',
      hint: 'البريد المسجّل على pawns.app',
      link: { label: 'سجّل في IPRoyal', url: 'https://pawns.app' } },
    { key: 'IPROYAL_PASS', label: 'IPRoyal Password', type: 'password',
      hint: 'كلمة مرور حساب IPRoyal' },
  ],
  peer2profit: [
    { key: 'PEER2PROFIT_EMAIL', label: 'Peer2Profit Email', type: 'email',
      hint: 'البريد المسجّل على Peer2Profit',
      link: { label: 'سجّل في Peer2Profit', url: 'https://peer2profit.com' } },
  ],
  repocket: [
    { key: 'REPOCKET_EMAIL', label: 'Repocket Email', type: 'email',
      hint: 'البريد المسجّل على Repocket',
      link: { label: 'سجّل في Repocket', url: 'https://link.repocket.co/nodepin' } },
    { key: 'REPOCKET_API_KEY', label: 'Repocket API Key', type: 'text',
      hint: 'انسخ الـ API Key من إعدادات حسابك' },
  ],
  earnapp: [
    { key: 'EARNAPP_UUID', label: 'EarnApp UUID', type: 'text',
      hint: 'UUID فريد لجهازك — أنشئه من الرابط أدناه',
      link: { label: 'أنشئ UUID', url: 'https://earnapp.com/i/sdk-node-uuid' } },
  ],
  bitping: [
    { key: 'BITPING_EMAIL', label: 'Bitping Email', type: 'email',
      hint: 'البريد المسجّل على Bitping',
      link: { label: 'سجّل في Bitping', url: 'https://app.bitping.com' } },
    { key: 'BITPING_PASSWORD', label: 'Bitping Password', type: 'password',
      hint: 'كلمة مرور حساب Bitping' },
  ],
  nodepay: [
    { key: 'NODEPAY_TOKEN', label: 'Nodepay API Token', type: 'text',
      hint: 'انسخ الـ Token من إعدادات حسابك على nodepay.ai',
      link: { label: 'سجّل في Nodepay', url: 'https://app.nodepay.ai' } },
  ],
  grass: [
    { key: 'GRASS_USER', label: 'Grass Email', type: 'email',
      hint: 'البريد المسجّل على getgrass.io',
      link: { label: 'سجّل في Grass', url: 'https://app.getgrass.io/register' } },
    { key: 'GRASS_PASS', label: 'Grass Password', type: 'password',
      hint: 'كلمة مرور حساب Grass' },
  ],
  packetstream: [
    { key: 'PACKETSTREAM_CID', label: 'PacketStream CID', type: 'text',
      hint: 'انسخ الـ CID من لوحة تحكم PacketStream',
      link: { label: 'سجّل في PacketStream', url: 'https://packetstream.io/?psr=nodepin' } },
  ],
  meson: [
    { key: 'MESON_TOKEN', label: 'Meson Token', type: 'text',
      hint: 'انسخ الـ Token من dashboard.meson.network',
      link: { label: 'سجّل في Meson', url: 'https://dashboard.meson.network' } },
  ],
  gradient: [
    { key: 'GRADIENT_EMAIL', label: 'Gradient Email', type: 'email',
      hint: 'البريد المسجّل على app.gradient.network',
      link: { label: 'سجّل في Gradient', url: 'https://app.gradient.network' } },
    { key: 'GRADIENT_PASS', label: 'Gradient Password', type: 'password',
      hint: 'كلمة مرور حساب Gradient' },
  ],
  proxyrack: [
    { key: 'PROXYRACK_UUID', label: 'Proxyrack UUID', type: 'text',
      hint: 'UUID فريد — أنشئه من إعدادات حسابك',
      link: { label: 'سجّل في Proxyrack', url: 'https://peer.proxyrack.com' } },
    { key: 'PROXYRACK_API_KEY', label: 'Proxyrack API Key', type: 'text',
      hint: 'انسخ الـ API Key من إعدادات حسابك' },
  ],
  uprock: [
    { key: 'UPROCK_EMAIL', label: 'Uprock Email', type: 'email',
      hint: 'البريد المسجّل على uprock.com',
      link: { label: 'سجّل في Uprock', url: 'https://uprock.com' } },
    { key: 'UPROCK_PASSWORD', label: 'Uprock Password', type: 'password',
      hint: 'كلمة مرور حساب Uprock' },
  ],
  huddle01: [
    { key: 'HUDDLE01_API_KEY', label: 'Huddle01 API Key', type: 'text',
      hint: 'انسخ الـ API Key من node.huddle01.com',
      link: { label: 'سجّل في Huddle01', url: 'https://node.huddle01.com' } },
  ],
  titan: [
    { key: 'TITAN_HASH', label: 'Titan Activation Code (Hash)', type: 'text',
      hint: 'انسخ الـ Hash من لوحة Titan Network',
      link: { label: 'سجّل في Titan', url: 'https://storage.titannet.io' } },
  ],
};

// ── Read saved config ──────────────────────────────────
function readConf() {
  try {
    if (!fs.existsSync(CONF_FILE)) return {};
    const raw = fs.readFileSync(CONF_FILE, 'utf8');
    const out = {};
    for (const line of raw.split('\n')) {
      const idx = line.indexOf('=');
      if (idx > 0 && !line.startsWith('#')) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        out[k] = v;
      }
    }
    return out;
  } catch { return {}; }
}

// ── Write config (never overwrites .env) ──────────────
function writeConf(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.writeFileSync(CONF_FILE, lines + '\n', { mode: 0o600 });
}

// ── Mask secrets for API responses ────────────────────
const MASK_KEYS = ['PASS', 'KEY', 'SECRET', 'TOKEN', 'WALLET', 'PASSPHRASE'];
function maskValue(key, val) {
  if (MASK_KEYS.some(k => key.toUpperCase().includes(k))) {
    return val ? '••••••••' : '';
  }
  return val;
}

// ── Run docker compose (non-blocking) ─────────────────
function dockerCompose(args) {
  return new Promise((resolve, reject) => {
    execFile('docker', ['compose', ...args], { cwd: '/nodepin' }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

// ── Express routes factory ─────────────────────────────
function registerSetupRoutes(app, requireAuth) {
  // GET /api/setup/fields — returns network field definitions (no secrets)
  app.get('/api/setup/fields', requireAuth, (_req, res) => {
    res.json(NETWORK_FIELDS);
  });

  // GET /api/setup/status — is setup done? which networks are configured?
  app.get('/api/setup/status', requireAuth, (_req, res) => {
    const conf = readConf();
    const configured = [];
    for (const [net, fields] of Object.entries(NETWORK_FIELDS)) {
      const required = fields.filter(f => !f.default);
      if (required.every(f => conf[f.key] && !conf[f.key].startsWith('your_'))) {
        configured.push(net);
      }
    }
    const enabled = (conf.ENABLED_NETWORKS || '').split(',').filter(Boolean);
    res.json({ configured, enabled, setupDone: enabled.length > 0 });
  });

  // GET /api/setup/values — returns saved values (secrets masked)
  app.get('/api/setup/values', requireAuth, (_req, res) => {
    const conf = readConf();
    const masked = {};
    for (const [k, v] of Object.entries(conf)) masked[k] = maskValue(k, v);
    res.json(masked);
  });

  // POST /api/setup/save — saves network config to volume
  // Body: { networks: ['mysterium','storj'], values: { KEY: 'val', ... } }
  app.post('/api/setup/save', requireAuth, (req, res) => {
    const { networks, values } = req.body || {};
    if (!Array.isArray(networks) || !networks.length) {
      return res.status(400).json({ error: 'اختر شبكة واحدة على الأقل' });
    }

    // Validate required fields for selected networks
    const errors = [];
    for (const net of networks) {
      const fields = NETWORK_FIELDS[net] || [];
      for (const f of fields) {
        if (!f.default && (!values?.[f.key] || String(values[f.key]).trim() === '')) {
          errors.push(`${net}: حقل "${f.label}" مطلوب`);
        }
      }
    }
    if (errors.length) return res.status(400).json({ error: errors.join(' | ') });

    // Merge with existing conf (preserve other keys)
    const existing = readConf();
    const updated = { ...existing, ...values, ENABLED_NETWORKS: networks.join(',') };
    writeConf(updated);
    res.json({ ok: true, networks });
  });

  // POST /api/setup/start — docker compose up for selected networks
  app.post('/api/setup/start', requireAuth, async (req, res) => {
    const conf = readConf();
    const networks = (conf.ENABLED_NETWORKS || '').split(',').filter(Boolean);
    if (!networks.length) return res.status(400).json({ error: 'لا توجد شبكات محفوظة. احفظ الإعداد أولاً.' });

    const profileFlags = networks.flatMap(n => ['--profile', n]);
    try {
      await dockerCompose([...profileFlags, 'pull', '--quiet']);
      await dockerCompose([...profileFlags, 'up', '-d']);
      res.json({ ok: true, networks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerSetupRoutes, NETWORK_FIELDS, readConf };
