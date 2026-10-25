import mcPing from 'mc-ping-updated';

const PING_TIMEOUT = 5000;
const CACHE_TTL = 30_000;

interface ServerStatus {
  online: boolean;
  onlinePlayers: number;
  maxPlayers: number;
}

const statusCache = new Map<string, ServerStatus & { expiresAt: number }>();

function cacheKey(host: string, port: number): string {
  return `${host}:${port}`;
}

export async function getServerStatus(host: string, port: number): Promise<ServerStatus> {
  const key = cacheKey(host, port);
  const cached = statusCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return { online: cached.online, onlinePlayers: cached.onlinePlayers, maxPlayers: cached.maxPlayers };
  }

  return new Promise((resolve) => {
    mcPing(host, port, (err, result) => {
      const online = !err && !!result?.players;
      const onlinePlayers = online ? (result!.players!.online ?? 0) : 0;
      const maxPlayers = online ? (result!.players!.max ?? 0) : 0;
      const status: ServerStatus = { online, onlinePlayers, maxPlayers };
      statusCache.set(key, { ...status, expiresAt: Date.now() + CACHE_TTL });
      resolve(status);
    }, PING_TIMEOUT);
  });
}
