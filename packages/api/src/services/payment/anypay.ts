import crypto from 'node:crypto';
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, VerifyWebhookResult } from './types.js';

const ANYPAY_MERCHANT_URL = 'https://anypay.io/merchant';

function uuidToPayId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(-15);
}

function parseFormBody(payload: unknown): Record<string, string> {
  if (typeof payload === 'object' && payload !== null) {
    return payload as Record<string, string>;
  }
  return {};
}

export class AnyPayGateway implements PaymentGateway {
  private merchantId: string;
  private secretKey: string;

  constructor(options: { merchantId: string; secretKey: string }) {
    this.merchantId = options.merchantId;
    this.secretKey = options.secretKey;
  }

  getGatewayName(): string {
    return 'anypay';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const payId = uuidToPayId(params.metadata.orderId || params.metadata.depositId || crypto.randomUUID());
    const currency = params.currency || 'RUB';
    const desc = params.description.slice(0, 150);
    const successUrl = params.returnUrl;
    const failUrl = params.returnUrl;

    const signStr = [this.merchantId, payId, params.amount.toFixed(2), currency, desc, successUrl, failUrl, this.secretKey].join(':');
    const sign = crypto.createHash('sha256').update(signStr).digest('hex');

    const queryParams = new URLSearchParams({
      merchant_id: this.merchantId,
      pay_id: payId,
      amount: params.amount.toFixed(2),
      currency,
      desc,
      success_url: successUrl,
      fail_url: failUrl,
      sign,
      order_id: params.metadata.orderId || '',
      deposit_id: params.metadata.depositId || '',
      server_id: params.metadata.serverId || '',
      type: params.metadata.type || '',
      user_id: params.metadata.userId || '',
    });

    return {
      paymentUrl: `${ANYPAY_MERCHANT_URL}?${queryParams.toString()}`,
      transactionId: payId,
    };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<VerifyWebhookResult> {
    const data = parseFormBody(payload);

    const status = data.status || '';
    if (!status) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    const signStr = [data.currency || '', data.amount || '', data.pay_id || '', this.merchantId, status, this.secretKey].join(':');
    const expectedSign = crypto.createHash('sha256').update(signStr).digest('hex');
    if (data.sign !== expectedSign) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    let mappedStatus: 'completed' | 'failed' | 'pending';
    switch (status) {
      case 'paid':
        mappedStatus = 'completed';
        break;
      case 'canceled':
      case 'expired':
      case 'error':
        mappedStatus = 'failed';
        break;
      case 'waiting':
        mappedStatus = 'pending';
        break;
      default:
        mappedStatus = 'pending';
    }

    const metadata: Record<string, string> = {};
    if (data.order_id) metadata.orderId = data.order_id;
    if (data.deposit_id) metadata.depositId = data.deposit_id;
    if (data.server_id) metadata.serverId = data.server_id;
    if (data.type) metadata.type = data.type;
    if (data.user_id) metadata.userId = data.user_id;

    if (!metadata.type) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }

    return {
      valid: true,
      transactionId: data.transaction_id || data.pay_id || '',
      status: mappedStatus,
      metadata,
      amount: data.amount ? Number(data.amount) : undefined,
    };
  }
}
