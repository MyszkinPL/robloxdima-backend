import { OrderErrorReason } from "./enums";

export interface OrderError {
  reason: OrderErrorReason | string;
  message: string | null;
}

export interface BaseResponse<T> {
  success: boolean;
  data: T;
}
