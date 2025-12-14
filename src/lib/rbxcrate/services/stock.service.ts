import { HttpClient } from "../core/http-client";
import { DetailedStockResponse, StockResponse } from "../types";

export class StockService {
  constructor(private http: HttpClient) {}

  async getSummary(): Promise<StockResponse> {
    try {
      return await this.http.request("/stock", "GET");
    } catch (error) {
      console.error("RbxCrate StockService.getSummary error:", error);
      return { robuxAvailable: 0, maxRobuxAvailable: 0 };
    }
  }

  async getDetailed(): Promise<DetailedStockResponse> {
    try {
      return await this.http.request("/stock/detailed", "GET");
    } catch (error) {
      console.error("RbxCrate StockService.getDetailed error:", error);
      return [];
    }
  }
}
