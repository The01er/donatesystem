export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
