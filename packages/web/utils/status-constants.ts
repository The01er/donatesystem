export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const WithdrawalStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export type WithdrawalStatusType = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export const RevokeStatus = {
  PENDING: 'pending',
  REVOKED: 'revoked',
  FAILED: 'failed',
} as const;

export type RevokeStatusType = (typeof RevokeStatus)[keyof typeof RevokeStatus];
