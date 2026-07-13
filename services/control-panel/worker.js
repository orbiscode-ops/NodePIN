export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // ── API Routes ───────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      // Login endpoint (no auth required)
      if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleLogin(request, env);
      }

      // All other API routes require authentication
      const authCheck = await checkAuth(request, env);
      if (!authCheck.ok) {
        return corsResponse(JSON.stringify({ error: 'غير مصرح' }), 401);
      }

      try {
        return await handleAPI(url, request, env);
      } catch (err) {
        return corsResponse(JSON.stringify({ error: err.message }), 500);
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};

// ── CORS helper ──────────────────────────────────────
function corsResponse(body, status = 200) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
  return new Response(body, { status, headers });
}

// ── Auth: Login ──────────────────────────────────────
async function handleLogin(request, env) {
  const password = env.DASHBOARD_PASSWORD;
  if (!password) {
    // No password set — open access
    return corsResponse(JSON.stringify({ ok: true, token: 'open' }));
  }

  const body = await request.json();
  if (body.password === password) {
    // Generate simple token (hash of password + timestamp)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + Date.now().toString().slice(0, -4));
    const hash = await crypto.subtle.digest('SHA-256', data);
    const token = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store token in D1 with expiry (24 hours)
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
      .bind('session_' + token.slice(0, 16), expiry, expiry).run();

    return corsResponse(JSON.stringify({ ok: true, token: token.slice(0, 16) }));
  }

  return corsResponse(JSON.stringify({ error: 'كلمة المرور غير صحيحة' }), 401);
}

// ── Auth: Check ──────────────────────────────────────
async function checkAuth(request, env) {
  const password = env.DASHBOARD_PASSWORD;
  if (!password) return { ok: true }; // No password = open access

  const token = request.headers.get('x-auth-token');
  if (!token) return { ok: false };

  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
    .bind('session_' + token).first();

  if (!row) return { ok: false };

  // Check expiry
  if (new Date(row.value) < new Date()) {
    await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind('session_' + token).run();
    return { ok: false };
  }

  return { ok: true };
}

// ── API Router ───────────────────────────────────────
async function handleAPI(url, request, env) {
  const path = url.pathname;
  const method = request.method;

  // ─── GET /api/servers — قائمة السيرفرات ─────────
  if (path === '/api/servers' && method === 'GET') {
    const servers = await env.DB.prepare('SELECT * FROM servers ORDER BY id').all();
    for (const s of servers.results) {
      const ips = await env.DB.prepare('SELECT ip FROM server_ips WHERE server_id = ?').bind(s.id).all();
      s.ips = [s.ip, ...ips.results.map(r => r.ip)];
      // لا نرسل مفتاح SSH كاملاً للواجهة — فقط إشارة أنه موجود
      s.has_key = !!s.ssh_key;
      delete s.ssh_key;
    }
    return corsResponse(JSON.stringify({ servers: servers.results }));
  }

  // ─── POST /api/servers — إضافة سيرفر جديد ──────
  if (path === '/api/servers' && method === 'POST') {
    const body = await request.json();
    const { name, ip, ssh_port, ssh_user, ssh_key } = body;

    if (!name || !ip || !ssh_key) {
      return corsResponse(JSON.stringify({ error: 'الاسم، الـ IP، ومفتاح SSH مطلوبين' }), 400);
    }

    const existing = await env.DB.prepare('SELECT id FROM servers WHERE ip = ?').bind(ip).first();
    if (existing) {
      return corsResponse(JSON.stringify({ error: 'هذا الـ IP مضاف مسبقاً' }), 409);
    }

    const result = await env.DB.prepare(
      'INSERT INTO servers (name, ip, ssh_port, ssh_user, ssh_key) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, ip, ssh_port || '22', ssh_user || 'root', ssh_key).run();

    return corsResponse(JSON.stringify({ ok: true, id: result.meta.last_row_id }), 201);
  }

  // ─── DELETE /api/servers/:id — حذف سيرفر ────────
  if (path.match(/^\/api\/servers\/\d+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    await env.DB.prepare('DELETE FROM server_ips WHERE server_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM servers WHERE id = ?').bind(id).run();
    return corsResponse(JSON.stringify({ ok: true }));
  }

  // ─── POST /api/servers/:id/ips — إضافة IP ──────
  if (path.match(/^\/api\/servers\/\d+\/ips$/) && method === 'POST') {
    const id = path.split('/')[3];
    const body = await request.json();
    if (!body.ip) {
      return corsResponse(JSON.stringify({ error: 'الـ IP مطلوب' }), 400);
    }
    await env.DB.prepare('INSERT INTO server_ips (server_id, ip) VALUES (?, ?)').bind(id, body.ip).run();
    return corsResponse(JSON.stringify({ ok: true }), 201);
  }

  // ─── GET /api/settings — جلب الإعدادات ──────────
  if (path === '/api/settings' && method === 'GET') {
    const rows = await env.DB.prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'session_%'").all();
    const settings = {};
    for (const r of rows.results) settings[r.key] = r.value;
    return corsResponse(JSON.stringify(settings));
  }

  // ─── POST /api/settings — حفظ الإعدادات ─────────
  if (path === '/api/settings' && method === 'POST') {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
      ).bind(key, value, value).run();
    }
    return corsResponse(JSON.stringify({ ok: true }));
  }

  // ─── Proxy: Forward to VPS control-panel ────────
  // For container/node operations, proxy to the target VPS
  if (path.startsWith('/api/containers') || path.startsWith('/api/metrics') || path.startsWith('/api/nodes')) {
    const serverId = request.headers.get('x-server-id');
    if (!serverId) {
      return corsResponse(JSON.stringify({ error: 'يرجى تحديد السيرفر المستهدف' }), 400);
    }

    // Fetch server SSH credentials from D1
    const server = await env.DB.prepare('SELECT * FROM servers WHERE id = ?').bind(serverId).first();
    if (!server) {
      return corsResponse(JSON.stringify({ error: 'السيرفر غير موجود' }), 404);
    }

    // Proxy to VPS control-panel running on port 3000
    const targetUrl = `http://${server.ip}:3000${path}${url.search}`;
    const headers = new Headers(request.headers);
    
    // Inject SSH credentials for the backend to use
    headers.set('x-ssh-host', server.ip);
    headers.set('x-ssh-port', server.ssh_port || '22');
    headers.set('x-ssh-user', server.ssh_user || 'root');
    headers.set('x-ssh-key', b64encode(server.ssh_key));

    try {
      const proxyReq = new Request(targetUrl, {
        method,
        headers,
        body: method !== 'GET' && method !== 'HEAD' ? await request.text() : undefined,
        redirect: 'manual'
      });
      const response = await fetch(proxyReq);
      const newRes = new Response(response.body, response);
      newRes.headers.set('Access-Control-Allow-Origin', '*');
      return newRes;
    } catch (err) {
      return corsResponse(JSON.stringify({ error: `فشل الاتصال بـ ${server.ip}: ${err.message}` }), 502);
    }
  }

  return corsResponse(JSON.stringify({ error: 'المسار غير موجود' }), 404);
}

function b64encode(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return globalThis.btoa(binary);
}
