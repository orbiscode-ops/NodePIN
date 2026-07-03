// ═══════════════════════════════════════════
// NodePIN — lightweight session auth (no external deps).
// Login with DASHBOARD_PASSWORD → signed HMAC cookie. Verified on each request.
// ═══════════════════════════════════════════
const crypto = require('crypto');

const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const API_KEY = process.env.API_KEY || '';
// Secret used to sign session cookies. Falls back to a per-process random
// value (sessions reset on restart) if not provided.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE = 'nodepin_session';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

const authEnabled = () => PASSWORD.length > 0;

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function issueToken() {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = `${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [exp, mac] = token.split('.');
  const expected = sign(exp);
  // constant-time compare
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function checkPassword(candidate) {
  if (!authEnabled()) return false;
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Express middleware: allow if auth disabled, valid session cookie, or valid API key.
function requireAuth(req, res, next) {
  if (!authEnabled()) return next();
  if (API_KEY && req.headers['x-api-key'] === API_KEY) return next();
  const token = parseCookies(req)[COOKIE];
  if (verifyToken(token)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login.html');
}

function setSessionCookie(res) {
  const secure = process.env.COOKIE_SECURE === 'true';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${issueToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_MS / 1000}` +
    (secure ? '; Secure' : ''));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

module.exports = { authEnabled, requireAuth, checkPassword, setSessionCookie, clearSessionCookie, COOKIE };
