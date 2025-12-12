import { OrderError } from "./common.dto";
import { OrderStatus, OrderType } from "./enums";

export interface RbxCrateWebhook {
  type: OrderType;
  uuid: string;
  orderId: string;
  price: number;
  rate: number;
  vendorId: string;
  robuxAmount: number;
  status: OrderStatus;
  robloxUserId: number;
  robloxUsername: string;
  buyerRobloxId: number | null;
  buyerRobloxUsername: string | null;
  error: OrderError | null;
  sign: string;
}
