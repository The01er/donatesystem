import crypto from 'node:crypto';
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, VerifyWebhookResult } from './types.js';

const ENOT_API_URL = 'https://api.enot.io/invoice/create';

function sortedJsonStringify(obj: Record<string, unknown>): string {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map((v) => sortedJsonStringify(v as Record<string, unknown>)).join(', ')}]`;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}: ${sortedJsonStringify(obj[key] as Record<string, unknown>)}`);
  return `{${parts.join(', ')}}`;
}

function getHookUrl(params: CreatePaymentParams): string | undefined {
  const slug = params.metadata.slug;
  if (!slug) return undefined;
  const baseUrl = params.returnUrl.split('/shop/')[0];
  const hostMatch = baseUrl.match(/^https?:\/\/(.+)$/);
  if (!hostMatch) return undefined;
  return `https://${slug}.${hostMatch[1]}/api/payment-webhook`;
}

export class EnotGateway implements PaymentGateway {
  private shopId: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor(options: { shopId: string; apiKey: string; webhookSecret?: string }) {
    this.shopId = options.shopId;
    this.apiKey = options.apiKey;
    this.webhookSecret = options.webhookSecret || '';
  }

  getGatewayName(): string {
    return 'enot';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const hookUrl = getHookUrl(params);
    const body: Record<string, unknown> = {
      amount: params.amount.toFixed(2),
      order_id: params.metadata.orderId || params.metadata.depositId || crypto.randomUUID(),
      currency: params.currency || 'RUB',
      shop_id: this.shopId,
      success_url: params.returnUrl,
      fail_url: params.returnUrl,
      custom_fields: JSON.stringify(params.metadata),
      comment: params.description.slice(0, 255),
      expire: 300,
    };
    if (hookUrl) {
      body.hook_url = hookUrl;
    }

    const response = await fetch(ENOT_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Enot.io API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      data?: { id: string; url: string };
      status: number;
      status_check: boolean;
    };

    if (!data.data?.url) {
      throw new Error('Enot.io: no payment URL in response');
    }

    return {
      paymentUrl: data.data.url,
      transactionId: data.data.id,
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<VerifyWebhookResult> {
    if (this.webhookSecret && signature) {
      const bodyStr = sortedJsonStringify(payload as Record<string, unknown>);
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');
      if (signature !== expected) {
        return { valid: false, transactionId: '', status: 'failed', metadata: {} };
      }
    }

    const data = payload as Record<string, unknown>;
    const status = data.status as string;
    const code = data.code as number;

    let mappedStatus: 'completed' | 'failed' | 'pending';
    if (status === 'success' && code === 1) {
      mappedStatus = 'completed';
    } else if (status === 'fail' || status === 'expired' || code === 31 || code === 32) {
      mappedStatus = 'failed';
    } else if (status === 'refund') {
      mappedStatus = 'failed';
    } else {
      mappedStatus = 'pending';
    }

    let metadata: Record<string, string> = {};
    const cf = data.custom_fields;
    if (cf && typeof cf === 'object') {
      metadata = cf as Record<string, string>;
    } else if (typeof cf === 'string') {
      try {
        metadata = JSON.parse(cf);
      } catch (e) {
        console.warn('[Enot] Failed to parse custom_fields JSON:', e);
      }
    }

    if (!metadata.type) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    return {
      valid: true,
      transactionId: (data.invoice_id as string) || '',
      status: mappedStatus,
      metadata,
      amount: data.amount ? Number(data.amount) : undefined,
    };
  }
}
