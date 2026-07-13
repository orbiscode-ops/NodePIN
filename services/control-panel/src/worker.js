/**
 * NodePIN — Cloudflare Worker Entry Point
 * Sentinel Node Management Dashboard
 */

import {
  getAuthConfig, setupAuth, updatePassword,
  listServers, getServer, getServerWithDecryptedCredential,
  createServer, updateServer, updateServerStatus, deleteServer,
  listNodes, getNode, createNode, updateNode, deleteNode,
  getDashboardStats
} from './db.js';

import {
  hashPassword, verifyPassword,
  generateSessionToken, generateRandomSecret,
  createSession, deleteSession, cleanupExpiredSessions
} from './auth.js';

import { checkConnection, getSystemInfo, getNodeStatus, controlNode } from './ssh.js';

// ══════════════════════════════════════════
// WORKER EXPORT
// ══════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS Headers ──
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-session-token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ── API Routes (static assets served by Cloudflare Assets binding) ──
    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await handleAPI(request, env, url);
        return addCorsHeaders(response, corsHeaders);
      } catch (err) {
        return addCorsHeaders(
          jsonResponse({ error: err.message }, 500),
          corsHeaders
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

// ══════════════════════════════════════════
// API ROUTER
// ══════════════════════════════════════════

async function handleAPI(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // ── Health Check (no auth) ──
  if (path === '/api/health') {
    const authConfig = await getAuthConfig(env.DB);
    return jsonResponse({
      status: 'ok',
      authRequired: !!authConfig,
      setupRequired: !authConfig
    });
  }

  // ── Auth Setup (first-time only) ──
  if (path === '/api/auth/setup' && method === 'POST') {
    const existing = await getAuthConfig(env.DB);
    if (existing) {
      return jsonResponse({ error: 'Auth already configured' }, 400);
    }

    const { password } = await request.json();
    if (!password || password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    const passwordHash = await hashPassword(password);
    const sessionSecret = generateRandomSecret();
    await setupAuth(env.DB, passwordHash, sessionSecret);

    return jsonResponse({ ok: true, message: 'Auth configured successfully' });
  }

  // ── Login ──
  if (path === '/api/auth/login' && method === 'POST') {
    const authConfig = await getAuthConfig(env.DB);
    if (!authConfig) {
      return jsonResponse({ error: 'Auth not configured. Call /api/auth/setup first.' }, 400);
    }

    const { password } = await request.json();
    const valid = await verifyPassword(password, authConfig.password_hash);
    if (!valid) {
      return jsonResponse({ error: 'Invalid password' }, 401);
    }

    // Clean up expired sessions
    await cleanupExpiredSessions(env.DB);

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    await createSession(env.DB, token, expiresAt);

    return jsonResponse({ ok: true, token, expiresAt });
  }

  // ── Logout ──
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = request.headers.get('x-session-token');
    if (token) await deleteSession(env.DB, token);
    return jsonResponse({ ok: true });
  }

  // ── Change Password ──
  if (path === '/api/auth/change-password' && method === 'POST') {
    const authResult = await authenticate(request, env);
    if (!authResult.authenticated) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { currentPassword, newPassword } = await request.json();
    if (!newPassword || newPassword.length < 8) {
      return jsonResponse({ error: 'New password must be at least 8 characters' }, 400);
    }

    const authConfig = await getAuthConfig(env.DB);
    const valid = await verifyPassword(currentPassword, authConfig.password_hash);
    if (!valid) {
      return jsonResponse({ error: 'Current password is incorrect' }, 401);
    }

    const newHash = await hashPassword(newPassword);
    await updatePassword(env.DB, newHash);

    return jsonResponse({ ok: true, message: 'Password updated' });
  }

  // ── All routes below require auth ──
  const authResult = await authenticate(request, env);
  if (!authResult.authenticated) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // ── Dashboard Stats ──
  if (path === '/api/dashboard' && method === 'GET') {
    const stats = await getDashboardStats(env.DB);
    return jsonResponse(stats);
  }

  // ── Servers CRUD ──
  if (path === '/api/servers' && method === 'GET') {
    const servers = await listServers(env.DB);
    return jsonResponse({ servers });
  }

  if (path === '/api/servers' && method === 'POST') {
    const body = await request.json();
    const { name, host, port, username, authType, credential } = body;

    if (!name || !host || !credential) {
      return jsonResponse({ error: 'Name, host, and credential are required' }, 400);
    }

    const result = await createServer(env.DB, {
      name, host, port: port || 22, username: username || 'root',
      authType: authType || 'password', credential
    }, env.ENCRYPTION_KEY);

    return jsonResponse({ ok: true, ...result }, 201);
  }

  if (path.match(/^\/api\/servers\/[^/]+$/) && method === 'GET') {
    const id = path.split('/').pop();
    const server = await getServer(env.DB, id);
    if (!server) return jsonResponse({ error: 'Server not found' }, 404);
    // Don't return encrypted credential
    const { auth_credential, auth_iv, auth_tag, ...safeServer } = server;
    return jsonResponse(safeServer);
  }

  if (path.match(/^\/api\/servers\/[^/]+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    const body = await request.json();
    await updateServer(env.DB, id, body, env.ENCRYPTION_KEY);
    return jsonResponse({ ok: true });
  }

  if (path.match(/^\/api\/servers\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    await deleteServer(env.DB, id);
    return jsonResponse({ ok: true });
  }

  // ── Server Actions ──
  if (path.match(/^\/api\/servers\/[^/]+\/check$/) && method === 'POST') {
    const id = path.split('/')[3];
    const server = await getServerWithDecryptedCredential(env.DB, id, env.ENCRYPTION_KEY);
    if (!server) return jsonResponse({ error: 'Server not found' }, 404);

    const online = await checkConnection({
      host: server.host,
      port: server.port,
      username: server.username,
      authType: server.auth_type,
      credential: server.credential
    });

    const status = online ? 'online' : 'offline';
    await updateServerStatus(env.DB, id, status);

    return jsonResponse({ ok: true, status });
  }

  if (path.match(/^\/api\/servers\/[^/]+\/info$/) && method === 'GET') {
    const id = path.split('/')[3];
    const server = await getServerWithDecryptedCredential(env.DB, id, env.ENCRYPTION_KEY);
    if (!server) return jsonResponse({ error: 'Server not found' }, 404);

    const info = await getSystemInfo({
      host: server.host,
      port: server.port,
      username: server.username,
      authType: server.auth_type,
      credential: server.credential
    });

    return jsonResponse({ info });
  }

  // ── Nodes CRUD ──
  if (path === '/api/nodes' && method === 'GET') {
    const serverId = url.searchParams.get('server_id');
    const nodes = await listNodes(env.DB, serverId);
    return jsonResponse({ nodes });
  }

  if (path === '/api/nodes' && method === 'POST') {
    const body = await request.json();
    const { serverId, name, protocol, port, configPath, ipAddress } = body;

    if (!serverId || !name || !protocol) {
      return jsonResponse({ error: 'Server ID, name, and protocol are required' }, 400);
    }

    if (!['v2ray', 'wireguard', 'openvpn'].includes(protocol)) {
      return jsonResponse({ error: 'Protocol must be v2ray, wireguard, or openvpn' }, 400);
    }

    const result = await createNode(env.DB, { serverId, name, protocol, port, configPath, ipAddress });
    return jsonResponse({ ok: true, ...result }, 201);
  }

  if (path.match(/^\/api\/nodes\/[^/]+$/) && method === 'GET') {
    const id = path.split('/').pop();
    const node = await getNode(env.DB, id);
    if (!node) return jsonResponse({ error: 'Node not found' }, 404);
    return jsonResponse(node);
  }

  if (path.match(/^\/api\/nodes\/[^/]+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    const body = await request.json();
    await updateNode(env.DB, id, body);
    return jsonResponse({ ok: true });
  }

  if (path.match(/^\/api\/nodes\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    await deleteNode(env.DB, id);
    return jsonResponse({ ok: true });
  }

  // ── Node Actions ──
  if (path.match(/^\/api\/nodes\/[^/]+\/status$/) && method === 'GET') {
    const id = path.split('/')[3];
    const node = await getNode(env.DB, id);
    if (!node) return jsonResponse({ error: 'Node not found' }, 404);

    const server = await getServerWithDecryptedCredential(env.DB, node.server_id, env.ENCRYPTION_KEY);
    if (!server) return jsonResponse({ error: 'Server not found' }, 404);

    const status = await getNodeStatus(
      { host: server.host, port: server.port, username: server.username,
        authType: server.auth_type, credential: server.credential },
      node.protocol,
      node.config_path
    );

    return jsonResponse({ status });
  }

  if (path.match(/^\/api\/nodes\/[^/]+\/control$/) && method === 'POST') {
    const id = path.split('/')[3];
    const { action } = await request.json();

    if (!['start', 'stop', 'restart'].includes(action)) {
      return jsonResponse({ error: 'Action must be start, stop, or restart' }, 400);
    }

    const node = await getNode(env.DB, id);
    if (!node) return jsonResponse({ error: 'Node not found' }, 404);

    const server = await getServerWithDecryptedCredential(env.DB, node.server_id, env.ENCRYPTION_KEY);
    if (!server) return jsonResponse({ error: 'Server not found' }, 404);

    const result = await controlNode(
      { host: server.host, port: server.port, username: server.username,
        authType: server.auth_type, credential: server.credential },
      node.protocol,
      action
    );

    // Update node status in DB
    const newStatus = action === 'stop' ? 'stopped' : 'running';
    await updateNode(env.DB, id, { status: result.success ? newStatus : 'error' });

    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

async function authenticate(request, env) {
  const token = request.headers.get('x-session-token');
  if (!token) return { authenticated: false };

  const session = await env.DB.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();

  return { authenticated: !!session };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function addCorsHeaders(response, corsHeaders) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers: newHeaders });
}
