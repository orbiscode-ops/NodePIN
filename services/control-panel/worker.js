export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API requests are proxied to the master control-panel server
    if (url.pathname.startsWith('/api/')) {
      // The master server IP is sent from the browser as x-master-host
      const masterHost = request.headers.get('x-master-host');

      if (!masterHost) {
        return new Response(JSON.stringify({ error: 'لم يتم تحديد سيرفر التحكم المركزي. يرجى إعداده من الإعدادات.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const masterPort = request.headers.get('x-master-port') || '3000';
      const targetUrl = `http://${masterHost}:${masterPort}${url.pathname}${url.search}`;

      // Forward all headers including SSH credentials
      const headers = new Headers(request.headers);

      try {
        const proxyRequest = new Request(targetUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
          redirect: 'manual'
        });

        const response = await fetch(proxyRequest);
        
        // Add CORS headers to allow dashboard to communicate
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Headers', '*');
        return newResponse;
      } catch (err) {
        return new Response(JSON.stringify({ error: `فشل الاتصال بسيرفر التحكم (${masterHost}:${masterPort}): ${err.message}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // Serve static assets (HTML, CSS, JS)
    return env.ASSETS.fetch(request);
  }
};
