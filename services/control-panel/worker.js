export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Intercept and proxy API requests to the dynamically specified VPS
    if (url.pathname.startsWith('/api/')) {
      // Read target VPS IP/Host from request headers
      const targetVpsHost = request.headers.get('x-vps-host');

      if (!targetVpsHost) {
        return new Response(JSON.stringify({ error: "Missing x-vps-host header. Please select a target server." }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Route the API call to the specific VPS IP/host dynamically on port 3000
      const targetUrl = `http://${targetVpsHost}:3000${url.pathname}${url.search}`;

      // Clone headers and preserve or inject the API key for VPS authentication
      const headers = new Headers(request.headers);
      
      // If the browser didn't send an x-api-key header, fallback to the Worker environment variable
      if (!headers.has('x-api-key') && env.DASHBOARD_API_KEY) {
        headers.set('x-api-key', env.DASHBOARD_API_KEY);
      }

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
