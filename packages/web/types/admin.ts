export interface AdminUser {
  id: string;
  email: string;
  bannedAt: string | null;
  banReason: string | null;
  balance?: number | null;
  createdAt: string;
  _count?: { servers: number };
  servers?: AdminUserServer[];
  platformStaff?: AdminStaffInfo | null;
  recentOrders?: AdminOrder[];
}

export interface AdminUserServer {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface AdminStaffInfo {
  isActive: boolean;
  role: string;
}

export interface AdminServer {
  id: string;
  name: string;
  gameType: string;
  slug: string;
  blockedAt: string | null;
  blockReason: string | null;
  planType: 'commission' | 'subscription';
  createdAt: string;
  owner: { id: string; email: string } | null;
  _count: { orders: number; products: number; members?: number };
  subscription?: { id: string; status: string; expiresAt: string } | null;
  wallet?: AdminWallet | null;
  monthlyRevenue?: number;
  recentOrders?: AdminOrder[];
}

export interface AdminWallet {
  balance: number;
  totalEarned: number;
}

export interface AdminOrder {
  id: string;
  playerName: string;
  status: string;
  totalAmount: number;
  paymentProvider?: string | null;
  productId: string;
  product: { name: string };
  serverId: string;
  server?: { id: string; name: string; slug: string; owner?: { email: string } };
  createdAt: string;
}

export interface AdminDeliveryAttemptItem {
  id: string;
  actionIndex: number;
  actionType: string;
  status: string;
  error: string | null;
  rollbackStatus: string | null;
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  playerName: string;
  status: string;
  totalAmount: number;
  commissionPct: number;
  commissionAmt: number;
  ownerAmount: number;
  paymentProvider?: string | null;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  committedActions: string | null;
  revokeStatus: string | null;
  revokeCommand: string | null;
  productId: string;
  product: { id: string; name: string; type: string; removeCommand?: string | null; actionsJson?: string | null };
  serverId: string;
  server: { id: string; name: string };
  createdAt: string;
  deliveryAttempts: AdminDeliveryAttemptItem[];
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  wallet?: {
    server?: {
      id: string;
      name: string;
      slug: string;
      owner?: { email: string };
    };
  };
}

export interface AdminTransaction {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  note: string | null;
  wallet?: {
    server?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface AdminStaff {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  user: { id: string; email: string };
}

export interface PaginatedResponse<T> {
  pagination: { page: number; limit: number; total: number; pages: number };
  [key: string]: T[] | { page: number; limit: number; total: number; pages: number };
}

export interface AdminTicket {
  id: string;
  userId: string;
  serverId: string | null;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string };
  server: { id: string; name: string } | null;
  _count: { messages: number };
}
