import { Rcon } from 'rcon-client';
import prisma from '../plugins/prisma.js';
import { decryptSecret } from '../lib/crypto.js';
import { OrderStatus } from '../constants/order-status.js';

export interface RconConfig {
  host: string;
  port: number;
  password: string;
}

export function parseRconConfig(server: { rconHost: string | null; rconPort: number | null; rconPassword: string | null }): RconConfig | null {
  if (!server.rconHost || !server.rconPassword) return null;
  const password = server.rconPassword.includes(':') ? decryptSecret(server.rconPassword) : server.rconPassword;
  return {
    host: server.rconHost,
    port: server.rconPort || 25575,
    password,
  };
}

export async function testRconConnection(config: RconConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const conn = await Rcon.connect({ host: config.host, port: config.port, password: config.password });
    await conn.send('list');
    await conn.end();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function executeRconCommand(config: RconConfig, command: string): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const conn = await Rcon.connect({ host: config.host, port: config.port, password: config.password });
    const output = await conn.send(command);
    await conn.end();
    return { ok: true, output };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function sanitizeMinecraftName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

function fillPlaceholders(command: string, playerName: string, orderId: string): string {
  return command
    .replace(/\{player\}/g, sanitizeMinecraftName(playerName))
    .replace(/\{order_id\}/g, orderId.slice(0, 8))
    .replace(/\{server\}/g, '')
    .replace(/^\//, '');
}

export async function deliverOrderViaRcon(
  orderId: string,
  serverId: string,
): Promise<{ ok: boolean; error?: string }> {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { rconHost: true, rconPort: true, rconPassword: true },
  });
  if (!server) return { ok: false, error: 'Server not found' };

  const config = parseRconConfig(server);
  if (!config) return { ok: false, error: 'RCON not configured' };

  console.log(`[RCON] Starting delivery for order ${orderId.slice(0, 8)} to ${config.host}:${config.port}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return { ok: false, error: 'Order not found' };

  if (order.status === OrderStatus.DELIVERED) {
    return { ok: true };
  }

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
      const result = await executeRconCommand(config, cmd);
      if (result.ok) {
        console.log(`[RCON] Order ${orderId.slice(0, 8)}: "${cmd}" → OK`);
      } else {
        console.log(`[RCON] Order ${orderId.slice(0, 8)}: "${cmd}" → FAILED (${result.error})`);
        allLinesOk = false;
      }
    }
    if (allLinesOk) {
      committedActions.push(i);
    } else {
      failed = true;
    }
  }

  await prisma.$transaction(async (tx) => {
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
            status: OrderStatus.FAILED,
            lastError: 'RCON delivery failed after max retries',
            heartbeatAt: null,
            committedActions: committedActions.length > 0 ? JSON.stringify(committedActions) : null,
            retryCount: newRetryCount,
          },
        });
        return;
      }

      await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.DELIVERING },
        data: {
          status: OrderStatus.PAID,
          lastError: 'RCON delivery failed, will retry',
          heartbeatAt: null,
          committedActions: committedActions.length > 0 ? JSON.stringify(committedActions) : null,
          retryCount: newRetryCount,
        },
      });
      return;
    }

    await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.DELIVERING },
      data: {
        status: OrderStatus.DELIVERED,
        heartbeatAt: null,
        committedActions: JSON.stringify(committedActions),
      },
    });
  });

  return { ok: !failed, error: failed ? 'RCON delivery failed' : undefined };
}
