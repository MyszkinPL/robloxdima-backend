import { HttpClient } from "./core/http-client";
import { BalanceService } from "./services/balance.service";
import { OrdersService } from "./services/orders.service";
import { StockService } from "./services/stock.service";

export interface RbxCrateClientOptions {
  /**
   * Base URL for the API.
   * Default: https://rbxcrate.com/api/v1
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds.
   * Default: 10000 (10 seconds)
   */
  timeout?: number;
}

export class RbxCrateClient {
  private http: HttpClient;

  public orders: OrdersService;
  public stock: StockService;
  public balance: BalanceService;

  constructor(apiKey: string, options?: RbxCrateClientOptions) {
    const baseUrl = options?.baseUrl || "https://rbxcrate.com/api";
    const timeout = options?.timeout || 10000;

    this.http = new HttpClient(baseUrl, apiKey, timeout);

    this.orders = new OrdersService(this.http);
    this.stock = new StockService(this.http);
    this.balance = new BalanceService(this.http);
  }
}
