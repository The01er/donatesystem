import crypto from 'node:crypto';
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, VerifyWebhookResult } from './types.js';

const YOOMONEY_PAYMENT_URL = 'https://yoomoney.ru/quickpay/confirm';

export class YooMoneyGateway implements PaymentGateway {
  private receiver: string;
  private secretKey: string;

  constructor(options: { receiver: string; secretKey: string }) {
    this.receiver = options.receiver;
    this.secretKey = options.secretKey;
  }

  getGatewayName(): string {
    return 'yoomoney';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const m = params.metadata;
    let label = '';
    const internalId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    if (m.type === 'order') label = `order_${m.orderId || internalId}`;
    else if (m.type === 'deposit') label = `deposit_${m.depositId || internalId}`;
    else if (m.type === 'subscription') label = `sub_${m.serverId || internalId}`;

    const queryStr = [
      `receiver=${encodeURIComponent(this.receiver)}`,
      'quickpay-form=button',
      `paymentType=${params.metadata.paymentType === 'AC' ? 'AC' : 'PC'}`,
      `sum=${params.amount.toFixed(2)}`,
      `label=${encodeURIComponent(label)}`,
      `successURL=${encodeURIComponent(params.returnUrl)}`,
    ].join('&');

    return {
      paymentUrl: `${YOOMONEY_PAYMENT_URL}?${queryStr}`,
      transactionId: `ym_${internalId}`,
    };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<VerifyWebhookResult> {
    const body = payload as Record<string, string>;

    if (!body.notification_type || !body.operation_id) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    if (!this.secretKey) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const params = { ...body };
    delete params.sign;

    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys
      .map((key) => {
        const val = params[key] || '';
        return `${key}=${encodeURIComponent(val)}`;
      })
      .join('&');

    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(signStr);
    const expectedSign = hmac.digest('hex');

    if (expectedSign !== body.sign) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const amount = parseFloat(body.withdraw_amount || body.amount);
    const label = body.label || '';

    const metadata: Record<string, string> = {};
    if (label.startsWith('order_')) {
      metadata.type = 'order';
      metadata.orderId = label.slice(6);
    } else if (label.startsWith('deposit_')) {
      metadata.type = 'deposit';
      metadata.depositId = label.slice(8);
    } else if (label.startsWith('sub_')) {
      metadata.type = 'subscription';
      metadata.serverId = label.slice(4);
    } else {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    return {
      valid: true,
      transactionId: body.operation_id,
      status: 'completed',
      amount,
      metadata,
    };
  }
}
