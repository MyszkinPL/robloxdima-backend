import { HttpClient } from "../core/http-client";
import { DetailedStockResponse, StockResponse } from "../types";

type DetailedStockApiResponse = 
  | DetailedStockResponse 
  | { stock?: DetailedStockResponse; data?: DetailedStockResponse };

export class StockService {
  constructor(private http: HttpClient) {}

  async getSummary(): Promise<StockResponse> {
    try {
      // Trying /orders/stock endpoint (mapped to /api/orders/stock)
      return await this.http.request("/orders/stock", "GET");
    } catch (error) {
      console.error("RbxCrate StockService.getSummary error:", error);
      return { robuxAvailable: 0, maxRobuxAvailable: 0 };
    }
  }

  async getDetailed(): Promise<DetailedStockResponse> {
    try {
      // Trying /orders/detailed-stock endpoint (mapped to /api/orders/detailed-stock)
      const response = await this.http.request<DetailedStockApiResponse>("/orders/detailed-stock", "GET");
      
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
