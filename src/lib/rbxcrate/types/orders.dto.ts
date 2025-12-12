import { BaseResponse, OrderError } from "./common.dto";
import { OrderStatus, OrderType } from "./enums";

export interface CreateGamepassOrderRequest {
  orderId: string;
  robloxUsername: string;
  robuxAmount: number;
  placeId: number;
  isPreOrder?: boolean;
  checkOwnership?: boolean;
  spoofedPlace?: {
    placeId: string;
    universeId: string;
  };
}

export interface ResendGamepassOrderRequest {
  orderId: string;
  placeId: number;
}

export interface CreateVipServerOrderRequest {
  orderId: string;
  robloxUsername: string;
  robuxAmount: number;
  placeId: number;
  isPreOrder?: boolean;
}

export interface GetOrderInfoRequest {
  orderId: string;
}

export interface CancelOrderRequest {
  orderId: string;
}

export interface CreateOrderData {
  orderId: string;
  robloxUsername: string;
  robloxUserId: number;
  robuxAmount: number;
  status: OrderStatus | string;
  universeId: number;
  placeId: number;
}

export interface OrderInfoResponse {
  type: OrderType | string;
  uuid: string;
  price: number;
  vendorId: string;
  robuxAmount: number;
  status: OrderStatus | string;
  robloxUserId: number;
  robloxUsername: string;
  error?: OrderError;
}

export type CreateGamepassOrderResponse = BaseResponse<CreateOrderData>;
export type CreateVipServerOrderResponse = BaseResponse<CreateOrderData>;
export type ResendGamepassOrderResponse = BaseResponse<{ success: boolean }>;
export type CancelOrderResponse = OrderInfoResponse;
