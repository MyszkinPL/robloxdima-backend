export interface StockResponse {
  robuxAvailable: number;
  maxRobuxAvailable: number;
}

export interface DetailedStockItem {
  rate: number;
  accountsCount: number;
  maxInstantOrder: number;
  totalRobuxAmount: number;
}

export type DetailedStockResponse = DetailedStockItem[];
