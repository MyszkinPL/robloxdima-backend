export interface Order {
  id: string;
  userId: string;
  username: string;
  type: 'gamepass' | 'vip';
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'failed' | 'processing' | 'cancelled';
  createdAt: string;
  rbxOrderId?: string;
  placeId: string;
}

export interface User {
  id: string;
  username?: string;
  firstName: string;
  photoUrl?: string;
  role: 'user' | 'admin';
  balance: number;
  isBanned: boolean;
  createdAt: string;
  bybitUid?: string;
}

export interface Log {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired';
  invoiceUrl?: string;
  createdAt: string;
   method?: string;
   providerData?: string | null;
}

export interface OrderRefundInfo {
  refunded: boolean;
  source?: RefundOrderSource;
  initiatorUserId?: string | null;
}

export type RefundOrderSource = "admin_cancel" | "rbx_webhook" | "order_create" | "system";

export type RefundOrderReason =
  | "ok"
  | "order_not_found"
  | "already_completed"
  | "already_failed_or_refunded";

export interface RefundOrderResult {
  refunded: boolean;
  reason: RefundOrderReason;
}

export interface AdminLogEntry {
  id: string;
  userId: string;
  userName?: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}
