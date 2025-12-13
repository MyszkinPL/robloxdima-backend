export class RbxCrateError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "RbxCrateError";
  }
}

export class RbxCrateValidationError extends RbxCrateError {
  constructor(message: string) {
    super(400, message);
    this.name = "RbxCrateValidationError";
  }
}

export class RbxCrateOutOfStockError extends RbxCrateError {
  constructor(message: string = "No stock available on Rbxcrate") {
    super(402, message);
    this.name = "RbxCrateOutOfStockError";
  }
}

export class RbxCrateInsufficientBalanceError extends RbxCrateError {
  constructor(message: string = "Insufficient balance") {
    super(403, message);
    this.name = "RbxCrateInsufficientBalanceError";
  }
}

export class RbxCrateNotFoundError extends RbxCrateError {
  constructor(message: string) {
    super(404, message);
    this.name = "RbxCrateNotFoundError";
  }
}

export class RbxCrateConflictError extends RbxCrateError {
  constructor(message: string) {
    super(409, message);
    this.name = "RbxCrateConflictError";
  }
}

export class RbxCrateRateLimitError extends RbxCrateError {
  constructor(message: string = "Too Many Requests") {
    super(429, message);
    this.name = "RbxCrateRateLimitError";
  }
}

export class RbxCrateTimeoutError extends RbxCrateError {
  constructor(message: string = "Request timed out") {
    super(408, message);
    this.name = "RbxCrateTimeoutError";
  }
}
