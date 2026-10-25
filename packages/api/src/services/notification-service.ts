import { ProxyAgent, fetch as proxyFetch } from 'undici';
import prisma from '../plugins/prisma.js';

export type NotificationEvent =
  | 'order.paid'
  | 'order.failed'
  | 'order.delivered'
  | 'withdrawal'
  | 'subscription'
  | 'stock.empty'
  | 'test';

export interface NotificationConfig {
  discordUrl?: string;
  telegramToken?: string;
  telegramChatId?: string;
  events: NotificationEvent[];
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

function getEventLabel(event: NotificationEvent): string {
  const labels: Record<string, string> = {
    'order.paid': 'Новый платёж',
    'order.failed': 'Ошибка выдачи',
    'order.delivered': 'Товар выдан',
    withdrawal: 'Вывод средств',
    subscription: 'Подписка',
    'stock.empty': 'Товар закончился',
    test: 'Тестовое уведомление',
  };
  return labels[event] || event;
}

function getEventColor(event: NotificationEvent): number {
  const colors: Record<string, number> = {
    'order.paid': 0x00ff00,
    'order.failed': 0xff0000,
    'order.delivered': 0x3498db,
    withdrawal: 0xf39c12,
    subscription: 0x9b59b6,
    'stock.empty': 0xe67e22,
    test: 0x95a5a6,
  };
  return colors[event] || 0x5865f2;
}

const PROXY_URL = process.env.NOTIFICATION_PROXY || '';
const RELAY_URL = process.env.NOTIFICATION_RELAY_URL || '';
const RELAY_TOKEN = process.env.NOTIFICATION_RELAY_TOKEN || '';
let proxyAgent: ProxyAgent | null = null;
if (PROXY_URL) {
  proxyAgent = new ProxyAgent(PROXY_URL);
}

const doFetch = proxyAgent
  ? (url: string, opts: Record<string, unknown>) => proxyFetch(url, { ...opts, dispatcher: proxyAgent })
  : (url: string, opts: Record<string, unknown>) => fetch(url, opts as RequestInit);

async function relayRequest(type: string, options: Record<string, unknown>, payload: unknown): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (RELAY_TOKEN) headers['authorization'] = `Bearer ${RELAY_TOKEN}`;
  const res = await doFetch(`${RELAY_URL}/notify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type, options, payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Relay ${res.status}: ${text}`);
  }
}

async function sendDiscord(webhookUrl: string, payload: DiscordPayload): Promise<void> {
  if (RELAY_URL) {
    return relayRequest('discord', { webhookUrl }, payload);
  }
  const res = await doFetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 429) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook ${res.status}: ${text}`);
  }
}

async function sendTelegram(token: string, chatId: string, text: string): Promise<void> {
  if (RELAY_URL) {
    return relayRequest('telegram', { token, chatId }, { text });
  }
  const res = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok && res.status !== 429) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram ${res.status}: ${body}`);
  }
}

function buildEmbed(
  event: NotificationEvent,
  data: Record<string, string>,
  serverName: string,
): DiscordEmbed {
  const fields = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    inline: true,
  }));

  return {
    title: getEventLabel(event),
    color: getEventColor(event),
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: serverName },
  };
}

function buildTelegramText(
  event: NotificationEvent,
  data: Record<string, string>,
  serverName: string,
): string {
  const lines = [
    `<b>${getEventLabel(event)}</b>`,
    `📦 <b>${serverName}</b>`,
    '',
  ];
  for (const [key, val] of Object.entries(data)) {
    lines.push(`<b>${key}:</b> ${val}`);
  }
  return lines.join('\n');
}

export async function sendNotification(
  config: NotificationConfig,
  event: NotificationEvent,
  data: Record<string, string>,
  serverName: string,
): Promise<void> {
  if (event !== 'test') {
    if (!config.events || config.events.length === 0) return;
    if (!config.events.includes(event)) return;
  }

  const errors: string[] = [];

  if (config.discordUrl) {
    try {
      const embed = buildEmbed(event, data, serverName);
      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' }, select: { brandName: true } });
      const brandName = settings?.brandName || 'DonatePlatform';
      await sendDiscord(config.discordUrl, { embeds: [embed], username: brandName });
    } catch (err) {
      errors.push(`Discord: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (config.telegramToken && config.telegramChatId) {
    try {
      const text = buildTelegramText(event, data, serverName);
      await sendTelegram(config.telegramToken, config.telegramChatId, text);
    } catch (err) {
      errors.push(`Telegram: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

export function parseNotificationConfig(raw: unknown): NotificationConfig {
  if (!raw || typeof raw !== 'object') {
    return { events: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    discordUrl: typeof obj.discordUrl === 'string' ? obj.discordUrl || undefined : undefined,
    telegramToken: typeof obj.telegramToken === 'string' ? obj.telegramToken || undefined : undefined,
    telegramChatId: typeof obj.telegramChatId === 'string' ? obj.telegramChatId || undefined : undefined,
    events: Array.isArray(obj.events) ? obj.events.filter((e): e is NotificationEvent => typeof e === 'string') : [],
  };
}

export const NOTIFICATION_EVENTS: { value: NotificationEvent; label: string }[] = [
  { value: 'order.paid', label: 'Новый платёж' },
  { value: 'order.failed', label: 'Ошибка выдачи' },
  { value: 'order.delivered', label: 'Товар выдан' },
  { value: 'withdrawal', label: 'Вывод средств' },
  { value: 'subscription', label: 'Подписка' },
  { value: 'stock.empty', label: 'Товар закончился' },
];
