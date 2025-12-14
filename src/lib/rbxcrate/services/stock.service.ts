import { HttpClient } from "../core/http-client";
import { DetailedStockResponse, StockResponse } from "../types";

export class StockService {
  constructor(private http: HttpClient) {}

  async getSummary(): Promise<StockResponse> {
    try {
      return await this.http.request("/orders/stock", "GET");
    } catch (error) {
      console.error("RbxCrate StockService.getSummary error:", error);
      return { robuxAvailable: 0, maxRobuxAvailable: 0 };
    }
  }

  async getDetailed(): Promise<DetailedStockResponse> {
    try {
      const response = await this.http.request<any>("/orders/detailed-stock", "GET");
      
      if (Array.isArray(response)) {
        return response;
      }
      
      // Handle potential wrapped responses
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.stock)) return response.stock;
        if (Array.isArray(response.items)) return response.items;
      }

      console.warn("RbxCrate getDetailed returned unexpected format:", JSON.stringify(response));
      return [];
    } catch (error) {
      console.error("RbxCrate StockService.getDetailed error:", error);
      return [];
    }
  }
}
