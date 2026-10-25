import crypto from 'node:crypto';
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, VerifyWebhookResult } from './types.js';

export class MockPaymentGateway implements PaymentGateway {
  getGatewayName(): string {
    return 'mock';
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const transactionId = crypto.randomUUID();
    const metadataEncoded = encodeURIComponent(JSON.stringify(params.metadata));
    const paymentUrl = `/api/payment/webhook?mock_confirm=${transactionId}&metadata=${metadataEncoded}`;
    return { paymentUrl, transactionId };
  }

  async verifyWebhook(payload: unknown, _signature: string): Promise<VerifyWebhookResult> {
    const data = payload as Record<string, string>;
    const transactionId = (data?.mock_confirm as string) || '';
    if (!transactionId) {
      return { valid: false, transactionId: '', status: 'failed', metadata: {} };
    }
    let metadata: Record<string, string> = {};
    if (data?.metadata) {
      if (typeof data.metadata === 'string') {
        try {
          metadata = JSON.parse(data.metadata);
        } catch {
          return { valid: false, transactionId, status: 'failed', metadata: {} };
        }
      } else if (typeof data.metadata === 'object' && data.metadata !== null) {
        metadata = data.metadata as Record<string, string>;
      }
    }
    return {
      valid: true,
      transactionId,
      status: 'completed',
      metadata,
      amount: data?.amount ? Number(data.amount) : undefined,
    };
  }
}
