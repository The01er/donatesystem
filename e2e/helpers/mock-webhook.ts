/**
 * Симуляция вебхука оплаты — вызывает внутренний API мок-гейтвея.
 * В dev-режиме мок-гейтвей принимает GET /api/payment/webhook?mock_confirm=...
 */

const API_BASE = 'http://127.0.0.1:3001';

interface MockWebhookOptions {
  orderId: string;
  amount: number;
  transactionId?: string;
}

/**
 * Подтверждает оплату заказа через мок-вебхук.
 * Используется в E2E-тестах для симуляции успешного платежа.
 */
export async function confirmOrderPayment(options: MockWebhookOptions): Promise<boolean> {
  const { orderId, amount, transactionId } = options;
  const tid = transactionId || `mock-txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const metadata = JSON.stringify({
    type: 'order',
    orderId,
    serverId: '',
  });

  const params = new URLSearchParams({
    mock_confirm: tid,
    metadata,
    amount: String(amount),
  });

  try {
    const res = await fetch(`${API_BASE}/api/payment/webhook?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json();
    return body?.received === true;
  } catch {
    return false;
  }
}

/**
 * Подтверждает депозит (пополнение баланса пользователя).
 */
export async function confirmDeposit(depositId: string, amount: number): Promise<boolean> {
  const tid = `mock-deposit-${Date.now()}`;
  const metadata = JSON.stringify({
    type: 'deposit',
    depositId,
  });

  const params = new URLSearchParams({
    mock_confirm: tid,
    metadata,
    amount: String(amount),
  });

  try {
    const res = await fetch(`${API_BASE}/api/payment/webhook?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json();
    return body?.received === true;
  } catch {
    return false;
  }
}

/**
 * Подтверждает оплату подписки.
 */
export async function confirmSubscriptionPayment(serverId: string, amount: number): Promise<boolean> {
  const tid = `mock-sub-${Date.now()}`;
  const metadata = JSON.stringify({
    type: 'subscription',
    serverId,
    userId: '',
  });

  const params = new URLSearchParams({
    mock_confirm: tid,
    metadata,
    amount: String(amount),
  });

  try {
    const res = await fetch(`${API_BASE}/api/payment/webhook?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await res.json();
    return body?.received === true;
  } catch {
    return false;
  }
}
