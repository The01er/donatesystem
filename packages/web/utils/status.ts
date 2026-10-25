const ORDER_STATUS_CLASSES: Record<string, string> = {
  pending: 'text-yellow-400',
  paid: 'text-green-400',
  delivering: 'text-blue-400',
  delivered: 'text-emerald-400',
  failed: 'text-red-400',
  cancelled: 'text-gray-500',
};

export function orderStatusClass(status: string): string {
  return ORDER_STATUS_CLASSES[status] || 'text-gray-400';
}

const WITHDRAWAL_STATUS_CLASSES: Record<string, string> = {
  pending: 'text-yellow-400',
  approved: 'text-blue-400',
  rejected: 'text-red-400',
  paid: 'text-green-400',
  completed: 'text-green-400',
};

export function withdrawalStatusClass(status: string): string {
  return WITHDRAWAL_STATUS_CLASSES[status] || 'text-gray-400';
}

const TX_TYPE_CLASSES: Record<string, string> = {
  order_commission: 'text-blue-400',
  payout: 'text-red-400',
  refund: 'text-yellow-400',
  correction: 'text-gray-400',
};

export function transactionTypeClass(type: string): string {
  return TX_TYPE_CLASSES[type] || 'text-gray-400';
}
