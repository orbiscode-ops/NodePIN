export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Intercept and proxy API requests dynamically to any target VPS
    if (url.pathname.startsWith('/api/')) {
      const targetVpsHost = request.headers.get('x-vps-host');

      if (!targetVpsHost) {
        return new Response(JSON.stringify({ error: "Missing x-vps-host header. Please select a target server." }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Proxy to the dynamic VPS IP and port 3000
      const targetUrl = `http://${targetVpsHost}:3000${url.pathname}${url.search}`;

      // Clone and forward all headers (including x-api-key)
      const headers = new Headers(request.headers);

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
        redirect: 'manual'
      });

      try {
        const response = await fetch(proxyRequest);
        return response;
      } catch (err) {
        return new Response(JSON.stringify({ error: `Connection to VPS at ${targetVpsHost} failed: ${err.message}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Serve static assets (HTML, CSS, JS) from the public directory
    return env.ASSETS.fetch(request);
  }
};
