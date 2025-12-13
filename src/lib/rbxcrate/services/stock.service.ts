import { HttpClient } from "../core/http-client";
import { DetailedStockResponse, StockResponse } from "../types";

export class StockService {
  constructor(private http: HttpClient) {}

  async getSummary(): Promise<StockResponse> {
    return this.http.request("/stock", "GET");
  }

  async getDetailed(): Promise<DetailedStockResponse> {
    return this.http.request("/stock/detailed", "GET");
  }
}
