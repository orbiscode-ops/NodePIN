/**
 * NodePIN — Authentication Module
 * Password hashing (SHA-256) and session token management.
 */

// ── Password Hashing ──

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  const saltHex = toHex(salt);
  const hashHex = toHex(new Uint8Array(bits));

  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;

  const encoder = new TextEncoder();
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  const hashHex = toHex(new Uint8Array(bits));
  return hashHex === expectedHash;
}

// ── Session Tokens ──

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

export function generateRandomSecret(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return toHex(bytes);
}

// ── Auth Middleware ──

export function requireAuth(env) {
  return async (request) => {
    // Check if auth is configured
    const authConfig = await env.DB.prepare('SELECT * FROM auth_config WHERE id = 1').first();
    if (!authConfig) {
      return { authenticated: true, setupRequired: true };
    }

    const token = request.headers.get('x-session-token');
    if (!token) return { authenticated: false };

    // Validate session from KV or D1
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
    ).bind(token).first();

    if (!session) return { authenticated: false };

    return { authenticated: true, session };
  };
}

// ── Session CRUD ──

export async function createSession(db, token, expiresAt) {
  await db.prepare(
    'INSERT INTO sessions (token, expires_at) VALUES (?, ?)'
  ).bind(token, expiresAt).run();
}

export async function deleteSession(db, token) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function cleanupExpiredSessions(db) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// ── Helpers ──

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
