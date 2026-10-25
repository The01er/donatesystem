export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  if (!pathname.startsWith('/uploads')) {
    return;
  }

  const target = `http://127.0.0.1:3001${pathname}${url.search}`;

  const proxyHeaders: Record<string, string> = {};
  for (const [key, value] of event.headers.entries()) {
    if (key !== 'host' && key !== 'connection' && key !== 'x-forwarded-host') {
      proxyHeaders[key] = value;
    }
  }
  proxyHeaders['x-forwarded-host'] = event.headers.get('host') || '';

  try {
    const res = await fetch(target, { method: event.method, headers: proxyHeaders });
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const data = await res.arrayBuffer();
    const uint8 = new Uint8Array(data);

    setResponseStatus(event, res.status);
    setResponseHeaders(event, { 'content-type': contentType, 'content-length': uint8.length });

    return uint8;
  } catch (err: unknown) {
    const e = err as Error;
    console.error(`[proxy] error:`, e.message || String(err));
    setResponseStatus(event, 502);
    return null;
  }
});
