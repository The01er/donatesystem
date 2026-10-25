export interface PaymentKeys {
  provider: string;
  secret?: string;
  publicKey?: string | null;
  extra?: Record<string, string> | null;
}

export interface User {
  id: string;
  email: string;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  balance?: number;
  legalStatus?: 'individual' | 'self_employed' | 'entrepreneur' | null;
  legalName?: string | null;
  inn?: string | null;
  legalAddress?: string | null;
}

export interface Server {
  id: string;
  name: string;
  gameType: string;
  ipAddress: string;
  slug: string;
  customDomain?: string | null;
  verifiedDns: boolean;
  planType: 'commission' | 'subscription';
  logoUrl?: string | null;
  coverUrl?: string | null;
  primaryColor: string;
  template?: string;
  upgradeEnabled?: boolean;
  upgradeMaxDays?: number;
  upgradeMaxDiscount?: number;
  upgradeNoCoupon?: boolean;
  showTopDonators?: boolean;
  showRecentPurchases?: boolean;
  paymentKeys?: PaymentKeys | null;
  rconHost?: string | null;
  rconPort?: number;
  subscription?: SubscriptionInfo | null;
  shopUrl?: string;
  operatingMode?: 'self_employed' | 'individual';
  createdAt: string;
}

export interface SubscriptionInfo {
  id: string;
  serverId: string;
  status: 'active' | 'cancelled' | 'expired';
  price: number;
  chargedFrom?: number | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductType = 'item' | 'privilege' | 'currency' | 'roulette' | 'other';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  stock?: number | null;
  type: ProductType;
  command?: string | null;
  removeCommand?: string | null;
  actionsJson?: string | null;
  serverId: string;
  upgradeAvailable?: boolean;
  createdAt: string;
  soldOut?: boolean;
}

export interface UpgradeInfo {
  productId: string;
  fromProductName: string;
  fromPrice: number;
  upgradePrice: number;
}

export interface ServerStats {
  ordersToday: number;
  revenueToday: number;
  balance: number;
  totalEarned: number;
  undeliveredOrders: number;
  outOfStockProducts: number;
  monthlyCommission: number;
  monthlyRevenue: number;
  currentOrders: number;
  previousPeriodRevenue: number;
  momsTrend: number;
  recentOrders: Order[];
  dailyRevenue: { date: string; amount: number }[];
}

export interface ConversionStats {
  totalViews: number;
  totalOrders: number;
  conversionRate: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productType: string | null;
  orders: number;
  revenue: number;
}

export interface ServerViewsStats {
  totalViews: number;
  uniqueVisitors: number;
  viewsByDay: { date: string; total: number; unique: number }[];
}

export interface AdminViewsStats {
  totalPlatformViews: number;
  topServers: { id: string; name: string; game: string; totalViews: number; uniqueVisitors: number }[];
  viewsByDay: { date: string; total: number; unique: number }[];
}

export interface Coupon {
  id: string;
  serverId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PluginTokenItem {
  id: string;
  serverId: string;
  name: string;
  isActive: boolean;
  maskedToken: string;
  lastSeen: string | null;
  createdAt: string;
}

export interface PluginTokenFull {
  id: string;
  serverId: string;
  name: string;
  isActive: boolean;
  token: string;
  lastSeen: string | null;
  createdAt: string;
}

export interface TopDonator {
  playerName: string;
  totalAmount: number;
  orderCount: number;
}

export interface ShopData {
  server: {
    id: string;
    name: string;
    gameType: string;
    ipAddress: string;
    slug: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    primaryColor: string;
    template: ShopTemplate;
    shopUrl: string;
    pluginDownloadUrl?: string | null;
    upgradeMaxDays: number;
    upgradeMaxDiscount: number;
    upgradeNoCoupon: boolean;
    showTopDonators: boolean;
    showRecentPurchases: boolean;
    online: boolean;
    onlinePlayers: number;
    maxPlayers: number;
  };
  products: (Product & { soldOut?: boolean; upgradeAvailable?: boolean })[];
  upgradeEnabled: boolean;
  paymentMethods: { provider: string; label: string }[];
}

export type ShopTemplate = 'gaming' | 'cyber';

export type CouponValidationResult =
  | { valid: true; discountType: 'percentage' | 'fixed' }
  | { valid: false; error: string };

export interface Order {
  id: string;
  playerName: string;
  status: 'pending' | 'paid' | 'delivering' | 'delivered' | 'failed' | 'cancelled';
  totalAmount: number;
  paymentProvider?: string | null;
  couponCode?: string | null;
  productId: string;
  product: { name: string; price: number };
  serverId: string;
  createdAt: string;
}

export interface DeliveryAttemptItem {
  id: string;
  actionIndex: number;
  actionType: string;
  status: string;
  error: string | null;
  rollbackStatus: string | null;
  createdAt: string;
}

export interface OrderDetail {
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
  createdAt: string;
  deliveryAttempts: DeliveryAttemptItem[];
}

export interface WalletData {
  id: string;
  balance: number;
  totalEarned: number;
  pendingAmount: number;
  availableBalance: number;
  serverId: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'order_commission' | 'payout' | 'refund' | 'correction' | 'withdrawal_rejected';
  orderId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  method: 'card' | 'sbp' | 'crypto';
  destination: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'completed';
  createdAt: string;
}

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  role: 'owner' | 'admin' | 'moderator';
  joinedAt: string;
  user: { id: string; email: string };
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  legalStatus?: string | null;
  legalName?: string | null;
  inn?: string | null;
  legalAddress?: string | null;
}

export interface ServerLegalDoc {
  slug: string;
  title: string;
  generated: boolean;
  exists: boolean;
  updatedAt: string | null;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface DepositTransaction {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  serverId: string | null;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  server?: { id: string; name: string } | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  user?: { email: string };
}

export type Paginated<T, K extends string = 'items'> = {
  [P in K]: T[];
} & {
  pagination: { page: number; limit: number; total: number; pages: number };
};

export interface TurnstileObject {
  render: (container: string | HTMLElement, opts: { sitekey: string }) => string;
  getResponse: (widgetId?: string) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileObject;
    onloadTurnstile?: () => void;
  }
}

export interface GuideListItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  category: string;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuideDetail {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  category: string;
  tags?: string | null;
  published: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LandingSectionHero {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage?: string;
}

export interface LandingSectionFeatures {
  items: { icon: string; title: string; desc: string }[];
}

export interface LandingSectionTestimonials {
  items: { avatar?: string; name: string; role: string; text: string }[];
}

export interface LandingSectionCTA {
  title: string;
  subtitle: string;
  btnText: string;
  btnLink: string;
}

export interface LandingSectionFooter {
  copyright: string;
  links: { text: string; url: string }[];
}

export interface LandingSectionRoadmap {
  title: string;
  items: { status: 'done' | 'in_progress' | 'planned'; text: string; date?: string; note?: string }[];
}

export interface LandingSections {
  hero?: LandingSectionHero;
  features?: LandingSectionFeatures;
  testimonials?: LandingSectionTestimonials;
  cta?: LandingSectionCTA;
  footer?: LandingSectionFooter;
  roadmap?: LandingSectionRoadmap;
}

export interface LandingResponse {
  sections: LandingSections;
  subscriptionPrice: number;
  currency: string;
  faq: FaqItem[];
  serverCount: number;
  featuredShops: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    gameType: string;
    customDomain: string | null;
  }[];
  platformDomain: string;
  operatingMode: string;
  platformName: string;
  platformEmail: string | null;
  platformPhone: string | null;
  platformInn: string | null;
  platformAddress: string | null;
}

export interface PaginatedGuides {
  items: GuideListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
