import { HttpClient } from "../core/http-client";
import { BalanceResponse } from "../types";

export class BalanceService {
  constructor(private http: HttpClient) {}

  async get(): Promise<BalanceResponse> {
    return this.http.request("/shared/balance", "GET");
  }
}
