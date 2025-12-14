import { HttpClient } from "../core/http-client";
import { DetailedStockResponse, StockResponse } from "../types";

export class StockService {
  constructor(private http: HttpClient) {}

  async getSummary(): Promise<StockResponse> {
    try {
      return await this.http.request("/shared/stock", "GET");
    } catch (error) {
      console.error("RbxCrate StockService.getSummary error:", error);
      return { robuxAvailable: 0, maxRobuxAvailable: 0 };
    }
  }

  async getDetailed(): Promise<DetailedStockResponse> {
    try {
      const response = await this.http.request<any>("/shared/detailed-stock", "GET");
      
      // Handle array response directly
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle object response with data/stock property
      if (response && Array.isArray(response.stock)) {
        return response.stock;
      }

      if (response && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("RbxCrate StockService.getDetailed error:", error);
      return [];
    }
  }
}
