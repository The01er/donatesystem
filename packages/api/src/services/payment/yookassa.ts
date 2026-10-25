import crypto from 'node:crypto';
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, VerifyWebhookResult } from './types.js';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3';

export class YooKassaGateway implements PaymentGateway {
  private shopId: string;
  private secretKey: string;
  private webhookSecret: string;

  constructor(options: { shopId: string; secretKey: string; webhookSecret?: string }) {
    this.shopId = options.shopId;
    this.secretKey = options.secretKey;
    this.webhookSecret = options.webhookSecret || '';
  }

  getGatewayName(): string {
    return 'yookassa';
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const idempotenceKey = crypto.randomUUID();

    const body = {
      amount: {
        value: params.amount.toFixed(2),
        currency: params.currency,
      },
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      description: params.description,
      metadata: params.metadata,
      capture: true,
    };

    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YooKassa API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      id: string;
      status: string;
      confirmation?: { confirmation_url: string };
    };

    if (!data.confirmation?.confirmation_url) {
      throw new Error('YooKassa: no confirmation_url in response');
    }

    return {
      paymentUrl: data.confirmation.confirmation_url,
      transactionId: data.id,
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<VerifyWebhookResult> {
    const data = payload as Record<string, unknown>;

    if (!data || data.type !== 'notification' || !data.object) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    if (!this.webhookSecret) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const basicMatch = signature.match(/^Basic\s+(.+)$/i);
    if (!basicMatch) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }
    try {
      const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf-8');
      const password = decoded.includes(':') ? decoded.split(':')[1] : '';
      if (password !== this.webhookSecret) {
        return { valid: false, transactionId: '', status: 'failed', metadata: {} };
      }
    } catch {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const event = data.event as string;
    const obj = data.object as Record<string, unknown>;

    let status: 'completed' | 'failed' | 'pending';
    if (event === 'payment.succeeded') {
      status = 'completed';
    } else if (event === 'payment.canceled') {
      status = 'failed';
    } else if (event === 'payment.waiting_for_capture') {
      status = 'pending';
    } else {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const metadata = (obj.metadata as Record<string, string>) || {};
    const amount = obj.amount as Record<string, string> | undefined;

    return {
      valid: true,
      transactionId: obj.id as string,
      status,
      metadata,
      amount: amount ? Number(amount.value) : undefined,
    };
  }
}
