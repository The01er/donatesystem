#!/usr/bin/env node

const http = require('http');

const PORT = Number(process.env.PORT) || 3002;
const AUTH_TOKEN = process.env.RELAY_TOKEN || '';

async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${body}`);
  return body;
}

async function sendDiscord(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 429) {
    const text = await res.text();
    throw new Error(`Discord ${res.status}: ${text}`);
  }
}

const server = http.createServer((req, res) => {
  const respond = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const url = req.url || '';
  console.log(`${req.method} ${url}`);

  if (req.method === 'GET' && url === '/health') {
    return respond(200, { ok: true });
  }

  if (req.method !== 'POST' || !url.startsWith('/notify')) {
    console.log(`  → 404 (method=${req.method}, url=${url})`);
    return respond(404, { error: 'Not found' });
  }

  if (AUTH_TOKEN) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${AUTH_TOKEN}`) {
      return respond(401, { error: 'Unauthorized' });
    }
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return respond(400, { error: 'Invalid JSON' });
    }

    const { type, options, payload } = data;
    console.log(`  → ${type} request`);

    try {
      if (type === 'telegram') {
        const result = await sendTelegram(options.token, options.chatId, payload.text);
        return respond(200, { ok: true, result });
      }
      if (type === 'discord') {
        await sendDiscord(options.webhookUrl, payload);
        return respond(200, { ok: true });
      }
      return respond(400, { error: `Unknown type: ${type}` });
    } catch (err) {
      console.log(`  → error: ${err.message}`);
      return respond(502, { ok: false, error: err.message });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Relay running on http://0.0.0.0:${PORT}`);
  console.log(`Auth: ${AUTH_TOKEN ? 'enabled' : 'disabled (INSECURE!)'}`);
});
