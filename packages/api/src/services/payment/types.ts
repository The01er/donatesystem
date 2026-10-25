export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  transactionId: string;
}

export interface VerifyWebhookResult {
  valid: boolean;
  transactionId: string;
  status: 'completed' | 'failed' | 'pending';
  metadata: Record<string, string>;
  amount?: number;
}

/**
 * Options injected by the gateway factory.
 * Production gateways (yookassa, stripe) MUST verify the HMAC signature
 * in `verifyWebhook()` using `webhookSecret`. The mock gateway is dev-only
 * and gated by NODE_ENV in `services/payment/index.ts`.
 */
export interface PaymentGatewayOptions {
  webhookSecret: string;
}

export interface PaymentGateway {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /**
   * Validate the inbound webhook payload.
   * Production gateways MUST verify the HMAC signature passed in `signature`
   * (typically from the `x-signature` HTTP header) using the gateway's
   * webhook signing secret. Return `{ valid: false }` for any failure
   * (bad signature, malformed payload, replay).
   */
  verifyWebhook(payload: unknown, signature: string): Promise<VerifyWebhookResult>;
  getGatewayName(): string;
}
