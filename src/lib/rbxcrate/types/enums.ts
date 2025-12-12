export enum OrderType {
  GamepassOrder = "gamepass_order",
  VipServer = "vip_server",
}

export enum OrderStatus {
  Completed = "Completed",
  Pending = "Pending",
  Queued = "Queued",
  QueuedDeferred = "Queued_Deferred",
  Error = "Error",
  Cancelled = "Cancelled",
  Processing = "Processing",
}

export enum OrderErrorReason {
  GamepassNotFound = "gamepass_not_found",
  InsufficientCustomerBalance = "insufficient_customer_balance",
  UnknownError = "unknown_error",
  VipServerNotFound = "vip_server_not_found",
  VipServerWrongPrice = "vip_server_wrong_price",
}
