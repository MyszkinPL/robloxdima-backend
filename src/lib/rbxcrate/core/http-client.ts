import {
  RbxCrateConflictError,
  RbxCrateError,
  RbxCrateInsufficientBalanceError,
  RbxCrateNotFoundError,
  RbxCrateOutOfStockError,
  RbxCrateRateLimitError,
  RbxCrateTimeoutError,
  RbxCrateValidationError,
} from "./errors";

export class HttpClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, apiKey: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async request<T>(endpoint: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    const headers: HeadersInit = {
      "api-key": this.apiKey,
      "Content-Type": "application/json",
      "User-Agent": "RbxCrateClient/1.0 (NodeJS)",
    };

    const config: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...config,
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorBody = await response.json();
          if (errorBody) {
            if (errorBody.message) errorMessage = errorBody.message;
            else if (errorBody.error && errorBody.error.message) errorMessage = errorBody.error.message;
          }
        } catch {
          // ignore
        }

        switch (response.status) {
          case 400:
            throw new RbxCrateValidationError(errorMessage);
          case 402:
            throw new RbxCrateOutOfStockError(errorMessage);
          case 403:
            throw new RbxCrateInsufficientBalanceError(errorMessage);
          case 404:
            throw new RbxCrateNotFoundError(errorMessage);
          case 409:
            throw new RbxCrateConflictError(errorMessage);
          case 429:
            throw new RbxCrateRateLimitError(errorMessage);
          default:
            throw new RbxCrateError(response.status, errorMessage);
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RbxCrateTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(id);
    }
  }
}
