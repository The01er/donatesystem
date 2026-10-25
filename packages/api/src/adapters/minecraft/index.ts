import mcPing from 'mc-ping-updated';
import { Rcon } from 'rcon-client';
import prisma from '../../plugins/prisma.js';
import { decryptSecret } from '../../lib/crypto.js';
import { OrderStatus } from '../../constants/order-status.js';
import type { GameAdapter, ServerStatus, DeliveryResult, CommandResult, ConnectionTestResult } from '../types.js';

type RconServer = {
  rconHost: string | null;
  rconPort: number | null;
  rconPassword: string | null;
};

const PING_TIMEOUT = 5000;
const PING_CACHE_TTL = 30_000;
const pingCache = new Map<string, ServerStatus & { expiresAt: number }>();

function pingCacheKey(host: string, port: number): string {
  return `${host}:${port}`;
}

export function parseRconConfig(server: RconServer): { host: string; port: number; password: string } | null {
  if (!server.rconHost || !server.rconPassword) return null;
  const password = server.rconPassword.includes(':') ? decryptSecret(server.rconPassword) : server.rconPassword;
  return { host: server.rconHost, port: server.rconPort || 25575, password };
}

export function sanitizeRecipient(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

export function fillPlaceholders(command: string, playerName: string, orderId: string): string {
  return command
    .replace(/\{player\}/g, sanitizeRecipient(playerName))
    .replace(/\{order_id\}/g, orderId.slice(0, 8))
    .replace(/\{server\}/g, '')
    .replace(/^\//, '');
}

export const minecraftAdapter: GameAdapter = {
  gameType: 'minecraft',
  label: 'Minecraft',

  sanitizeRecipient,

  async getServerStatus(server: { ipAddress: string | null }): Promise<ServerStatus> {
    if (!server.ipAddress) return { online: false, onlinePlayers: 0, maxPlayers: 0 };

    const host = server.ipAddress.includes(':') ? server.ipAddress.split(':')[0] : server.ipAddress;
    const port = server.ipAddress.includes(':') ? Number(server.ipAddress.split(':')[1]) : 25565;
    const key = pingCacheKey(host, port);
    const cached = pingCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return { online: cached.online, onlinePlayers: cached.onlinePlayers, maxPlayers: cached.maxPlayers };
    }

    return new Promise((resolve) => {
      mcPing(host, port, (err: Error | null, result?: { players?: { online?: number; max?: number } }) => {
        const online = !err && !!result?.players;
        const onlinePlayers = online ? (result!.players!.online ?? 0) : 0;
        const maxPlayers = online ? (result!.players!.max ?? 0) : 0;
        const status: ServerStatus = { online, onlinePlayers, maxPlayers };
        pingCache.set(key, { ...status, expiresAt: Date.now() + PING_CACHE_TTL });
        resolve(status);
      }, PING_TIMEOUT);
    });
  },

  isDeliverable(server: RconServer): boolean {
    return !!server.rconHost && !!server.rconPassword;
  },

  async deliverOrder(orderId: string, serverId: string): Promise<DeliveryResult> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { rconHost: true, rconPort: true, rconPassword: true },
    });
    if (!server) return { ok: false, error: 'Server not found' };

    const config = parseRconConfig(server);
    if (!config) return { ok: false, error: 'RCON not configured' };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order) return { ok: false, error: 'Order not found' };

    if (order.status === OrderStatus.DELIVERED) return { ok: true };

    const rawActions = order.product.actionsJson;
    let actionsList: Array<{ type: string; value: string }> = [];
    if (typeof rawActions === 'string') {
      try { actionsList = JSON.parse(rawActions); } catch { actionsList = []; }
    } else if (Array.isArray(rawActions)) {
      actionsList = rawActions as Array<{ type: string; value: string }>;
    }

    if (actionsList.length === 0) {
      await prisma.order.updateMany({
        where: { id: orderId, status: { in: [OrderStatus.PAID, OrderStatus.DELIVERING] } },
        data: { status: OrderStatus.DELIVERED },
      });
      return { ok: true };
    }

    const transitioned = await prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.PAID },
      data: { status: OrderStatus.DELIVERING, heartbeatAt: new Date() },
    });
    if (transitioned.count === 0) {
      return { ok: true, error: 'Order already being delivered or delivered' };
    }

    const committedActions: number[] = [];
    let failed = false;

    for (let i = 0; i < actionsList.length; i++) {
      const action = actionsList[i];
      if (action.type !== 'command') continue;

      const raw = fillPlaceholders(action.value, order.playerName, order.id);
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      let allLinesOk = true;
      for (const cmd of lines) {
        try {
          const conn = await Rcon.connect({ host: config.host, port: config.port, password: config.password });
          await conn.send(cmd);
          await conn.end();
        } catch (e: unknown) {
          allLinesOk = false;
        }
      }
      if (allLinesOk) {
        committedActions.push(i);
      } else {
        failed = true;
      }
    }

    await prisma.$transaction(async (tx: any) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { retryCount: true, maxRetries: true },
      });
      const currentRetryCount = currentOrder?.retryCount ?? 0;
      const currentMaxRetries = currentOrder?.maxRetries ?? 3;

      if (failed) {
        const newRetryCount = currentRetryCount + 1;

        if (newRetryCount >= currentMaxRetries) {
          await tx.order.updateMany({
            where: { id: orderId, status: OrderStatus.DELIVERING },
            data: {
              status: OrderStatus.FAILED, lastError: 'RCON delivery failed after max retries',
              heartbeatAt: null, committedActions: committedActions.length > 0 ? JSON.stringify(committedActions) : null,
              retryCount: newRetryCount,
            },
          });
          return;
        }

        await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.DELIVERING },
          data: {
            status: OrderStatus.PAID, lastError: 'RCON delivery failed, will retry',
            heartbeatAt: null, committedActions: committedActions.length > 0 ? JSON.stringify(committedActions) : null,
            retryCount: newRetryCount,
          },
        });
        return;
      }

      await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.DELIVERING },
        data: { status: OrderStatus.DELIVERED, heartbeatAt: null, committedActions: JSON.stringify(committedActions) },
      });
    });

    return { ok: !failed, error: failed ? 'RCON delivery failed' : undefined };
  },

  async executeCommands(
    server: RconServer,
    commands: string[],
    recipientName: string,
    orderId: string,
  ): Promise<{ ok: boolean; results: CommandResult[] }> {
    const config = parseRconConfig(server);
    if (!config) return { ok: false, results: [] };

    const results: CommandResult[] = [];
    for (const raw of commands) {
      const cmd = fillPlaceholders(raw, recipientName, orderId);
      try {
        const conn = await Rcon.connect({ host: config.host, port: config.port, password: config.password });
        const output = await conn.send(cmd);
        await conn.end();
        results.push({ ok: true, output });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ ok: false, error: msg });
      }
    }
    return { ok: results.every((r) => r.ok), results };
  },

  async testConnection(server: RconServer): Promise<ConnectionTestResult> {
    const config = parseRconConfig(server);
    if (!config) return { ok: false, error: 'RCON not configured' };
    try {
      const conn = await Rcon.connect({ host: config.host, port: config.port, password: config.password });
      await conn.send('list');
      await conn.end();
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  },

};
