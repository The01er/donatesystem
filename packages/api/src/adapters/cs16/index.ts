import dgram from 'node:dgram';
import prisma from '../../plugins/prisma.js';
import { decryptSecret } from '../../lib/crypto.js';
import { OrderStatus } from '../../constants/order-status.js';
import type { GameAdapter, ServerStatus, DeliveryResult, CommandResult, ConnectionTestResult } from '../types.js';

const DEFAULT_PORT = 27015;
const UDP_TIMEOUT = 3000;

type CsServer = {
  rconHost: string | null;
  rconPort: number | null;
  rconPassword: string | null;
};

export function getRconConfig(server: CsServer): { host: string; port: number; password: string } | null {
  if (!server.rconHost || !server.rconPassword) return null;
  const password = server.rconPassword.includes(':') ? decryptSecret(server.rconPassword) : server.rconPassword;
  return { host: server.rconHost, port: server.rconPort || DEFAULT_PORT, password };
}

function sendUdp(host: string, port: number, data: Buffer): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, UDP_TIMEOUT);

    socket.on('message', (msg) => {
      clearTimeout(timer);
      socket.close();
      resolve(msg);
    });

    socket.on('error', () => {
      clearTimeout(timer);
      socket.close();
      resolve(null);
    });

    socket.send(data, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        socket.close();
        resolve(null);
      }
    });
  });
}

async function rconCommand(host: string, port: number, password: string, command: string): Promise<string | null> {
  const cmd = `\xFF\xFF\xFF\xFFrcon ${password} ${command}`;
  const response = await sendUdp(host, port, Buffer.from(cmd, 'binary'));
  if (!response) return null;

  const text = response.toString('binary');
  const header = '\xFF\xFF\xFF\xFF';
  if (text.startsWith(header)) {
    return text.slice(header.length).replace(/\n$/, '').trim();
  }
  return text.trim();
}

function readNullString(buf: Buffer, offset: number): { str: string; nextOffset: number } {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  return { str: buf.toString('binary', offset, end), nextOffset: end + 1 };
}

export const cs16Adapter: GameAdapter = {
  gameType: 'cs16',
  label: 'Counter-Strike 1.6',

  async getServerStatus(server: { ipAddress: string | null }): Promise<ServerStatus> {
    if (!server.ipAddress) return { online: false, onlinePlayers: 0, maxPlayers: 0 };

    const host = server.ipAddress.includes(':') ? server.ipAddress.split(':')[0] : server.ipAddress;
    const port = server.ipAddress.includes(':') ? Number(server.ipAddress.split(':')[1]) : DEFAULT_PORT;

    // A2S_INFO query — standard for both GoldSource and Source
    const query = Buffer.from('\xFF\xFF\xFF\xFFTSource Engine Query\x00', 'binary');
    let response = await sendUdp(host, port, query);

    // Fallback: old GoldSource info query
    if (!response) {
      response = await sendUdp(host, port, Buffer.from('\xFF\xFF\xFF\xFFinfo\x00', 'binary'));
    }

    if (!response) return { online: false, onlinePlayers: 0, maxPlayers: 0 };

    try {
      // Check header
      if (response.length < 5 || response.readUInt32BE(0) !== 0xffffffff) {
        return { online: false, onlinePlayers: 0, maxPlayers: 0 };
      }

      const typeByte = String.fromCharCode(response[4]);

      if (typeByte === 'I') {
        // Source Engine response
        let offset = 5;
        offset += 1; // skip protocol/netcode byte
        const name = readNullString(response, offset); offset = name.nextOffset;   // server name
        const map = readNullString(response, offset); offset = map.nextOffset;      // map name
        const game = readNullString(response, offset); offset = game.nextOffset;     // game folder
        const desc = readNullString(response, offset); offset = desc.nextOffset;     // game description
        offset += 2; // skip appId (short LE)
        const players = response[offset] || 0;
        const maxPlayers = response[offset + 1] || 0;
        return { online: true, onlinePlayers: players, maxPlayers };

      } else if (typeByte === 'm') {
        // GoldSource (HLDS) response
        let offset = 5;
        const addr = readNullString(response, offset); offset = addr.nextOffset;     // server IP/address
        const name = readNullString(response, offset); offset = name.nextOffset;     // server name
        const map = readNullString(response, offset); offset = map.nextOffset;       // map name
        const game = readNullString(response, offset); offset = game.nextOffset;      // game folder
        const desc = readNullString(response, offset); offset = desc.nextOffset;      // game description
        const players = response[offset] || 0;
        const maxPlayers = response[offset + 1] || 0;
        return { online: true, onlinePlayers: players, maxPlayers };

      } else {
        // Unknown response type — server responded but can't parse
        return { online: true, onlinePlayers: 0, maxPlayers: 0 };
      }
    } catch {
      return { online: true, onlinePlayers: 0, maxPlayers: 0 };
    }
  },

  isDeliverable(server: CsServer): boolean {
    return !!server.rconHost && !!server.rconPassword;
  },

  async deliverOrder(orderId: string, serverId: string): Promise<DeliveryResult> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { rconHost: true, rconPort: true, rconPassword: true },
    });
    if (!server) return { ok: false, error: 'Server not found' };

    const config = getRconConfig(server);
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

      const raw = action.value
        .replace(/\{player\}/g, order.playerName.replace(/[^a-zA-Z0-9_ -]/g, ''))
        .replace(/\{order_id\}/g, order.id.slice(0, 8))
        .replace(/\{server\}/g, '')
        .replace(/^\//, '');

      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      let allLinesOk = true;
      for (const cmd of lines) {
        const result = await rconCommand(config.host, config.port, config.password, cmd);
        if (result === null) {
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
    server: CsServer,
    commands: string[],
    recipientName: string,
    orderId: string,
  ): Promise<{ ok: boolean; results: CommandResult[] }> {
    const config = getRconConfig(server);
    if (!config) return { ok: false, results: [] };

    const results: CommandResult[] = [];
    for (const raw of commands) {
      const cmd = raw
        .replace(/\{player\}/g, recipientName.replace(/[^a-zA-Z0-9_ -]/g, ''))
        .replace(/\{order_id\}/g, orderId.slice(0, 8))
        .replace(/\{server\}/g, '')
        .replace(/^\//, '');

      const output = await rconCommand(config.host, config.port, config.password, cmd);
      if (output !== null) {
        results.push({ ok: true, output });
      } else {
        results.push({ ok: false, error: 'RCON command failed or timed out' });
      }
    }
    return { ok: results.every((r) => r.ok), results };
  },

  async testConnection(server: CsServer): Promise<ConnectionTestResult> {
    const config = getRconConfig(server);
    if (!config) return { ok: false, error: 'RCON not configured' };

    const response = await rconCommand(config.host, config.port, config.password, 'echo test');
    if (response === null) {
      return { ok: false, error: 'RCON connection failed or timed out' };
    }
    return { ok: true };
  },

  sanitizeRecipient(name: string): string {
    return name.replace(/[^a-zA-Z0-9_ -]/g, '');
  },
};
