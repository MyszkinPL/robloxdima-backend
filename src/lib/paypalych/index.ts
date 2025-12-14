
import { bill } from "./resources/bill"
import { payment } from "./resources/payment"
import { payout } from "./resources/payout"
import { refund } from "./resources/refund"
import { balance } from "./resources/balance"

export const paypalych = {
  ...bill,
  ...payment,
  ...payout,
  ...refund,
  ...balance,
  
  // Expose namespaces if needed
  bill,
  payment,
  payout,
  refund,
  balance,
}

export * from "./types"
