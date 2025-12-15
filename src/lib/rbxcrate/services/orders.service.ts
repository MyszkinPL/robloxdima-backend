import { RbxCrateValidationError } from "../core/errors";
import { HttpClient } from "../core/http-client";
import {
  CancelOrderRequest,
  CancelOrderResponse,
  CreateGamepassOrderRequest,
  CreateGamepassOrderResponse,
  CreateVipServerOrderRequest,
  CreateVipServerOrderResponse,
  GetOrderInfoRequest,
  OrderInfoResponse,
  ResendGamepassOrderRequest,
  ResendGamepassOrderResponse,
} from "../types";

export class OrdersService {
  constructor(private http: HttpClient) {}

  private validateUsername(username: string, maxLength: number = 20) {
    if (username.length < 3 || username.length > maxLength) {
      throw new RbxCrateValidationError(`Username must be between 3 and ${maxLength} characters`);
    }
  }

  private validateAmount(amount: number) {
    if (amount <= 0) {
      throw new RbxCrateValidationError("Robux amount must be greater than 0");
    }
  }

  async createGamepass(data: CreateGamepassOrderRequest): Promise<CreateGamepassOrderResponse> {
    this.validateUsername(data.robloxUsername, 20);
    this.validateAmount(data.robuxAmount);
    return this.http.request("/orders/gamepass", "POST", data);
  }

  async resendGamepass(data: ResendGamepassOrderRequest): Promise<ResendGamepassOrderResponse> {
    return this.http.request("/orders/gamepass/resend", "POST", data);
  }

  async createVipServer(data: CreateVipServerOrderRequest): Promise<CreateVipServerOrderResponse> {
    this.validateUsername(data.robloxUsername, 50);
    this.validateAmount(data.robuxAmount);
    return this.http.request("/orders/vip-server", "POST", data);
  }

  async cancel(data: CancelOrderRequest): Promise<CancelOrderResponse> {
    return this.http.request("/orders/cancel", "POST", data);
  }

  async getInfo(data: GetOrderInfoRequest): Promise<OrderInfoResponse> {
    return this.http.request("/orders/info", "POST", data);
  }
}
