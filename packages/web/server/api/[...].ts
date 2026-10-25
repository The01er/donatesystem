export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const target = `http://127.0.0.1:3001${url.pathname}${url.search}`;

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const proxyHeaders: Record<string, string> = {};
  for (const [key, value] of event.headers.entries()) {
    if (key !== 'host' && key !== 'connection' && key !== 'content-length' && key !== 'x-forwarded-host') {
      proxyHeaders[key] = value;
    }
  }
  proxyHeaders['x-forwarded-host'] = event.headers.get('host') || '';

  try {
    let body: BodyInit | null = null;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
      body = (await readRawBody(event)) ?? null;
    }

    const res = await fetch(target, {
      method: event.method,
      headers: proxyHeaders,
      body,
    });

    const contentType = res.headers.get('content-type') || 'application/json';
    const setCookie = res.headers.get('set-cookie');
    const text = await res.text();

    const responseHeaders: Record<string, string> = {
      'content-type': contentType,
    };
    if (setCookie) {
      responseHeaders['set-cookie'] = setCookie;
    }

    // CORS: only allow whitelisted origins (avoid wildcard + credentials misconfig)
    const origin = event.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      responseHeaders['access-control-allow-origin'] = origin;
      responseHeaders['access-control-allow-credentials'] = 'true';
      responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      responseHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, X-Signature, X-Plugin-Token';
    }

    setResponseStatus(event, res.status);
    setResponseHeaders(event, responseHeaders);

    return text;
  } catch (_err) {
    setResponseStatus(event, 502);
    return JSON.stringify({ error: 'API unavailable', detail: 'Internal proxy error' });
  }
});
