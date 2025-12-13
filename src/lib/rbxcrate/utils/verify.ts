import crypto from "node:crypto";
import { RbxCrateWebhook } from "../types";

/**
 * List of IP addresses from which RBXCRATE sends webhooks.
 * You should whitelist these IPs in your firewall or application logic.
 */
export const RBXCRATE_WEBHOOK_IPS = ["141.98.171.203"];

/**
 * Sorts object keys recursively to ensure consistent JSON stringification.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }
  return Object.keys(obj)
    .sort()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((result: any, key) => {
      result[key] = sortObject(obj[key]);
      return result;
    }, {});
}

/**
 * Generates signature for RBXCRATE webhook verification.
 * Algorithm: MD5(Base64(Payload) + API_KEY)
 * 
 * NOTE: This function relies on 'node:crypto' and is intended for Server-Side use only (Node.js).
 * 
 * @param payload The raw JSON string of the webhook body (without the 'sign' field if checking against an object)
 *                OR the object itself which will be stringified.
 *                IMPORTANT: If passing an object, ensure it doesn't contain the 'sign' property.
 * @param apiKey Your Merchant API Key
 */
export function generateSign(payload: string | Omit<RbxCrateWebhook, 'sign'>, apiKey: string): string {
  let payloadString: string;

  if (typeof payload === 'string') {
    payloadString = payload;
  } else {
    // We sort object keys to ensure consistent stringification order
    // This is critical because {"a":1,"b":2} and {"b":2,"a":1} produce different strings but are same objects
    const sortedPayload = sortObject(payload);
    payloadString = JSON.stringify(sortedPayload);
  }

  // Algorithm: MD5(Base64(Payload) + API_KEY)
  const base64Payload = Buffer.from(payloadString).toString('base64');
  
  return crypto
    .createHash('md5')
    .update(base64Payload + apiKey)
    .digest('hex');
}

/**
 * Verifies if the received webhook signature is valid.
 * 
 * NOTE: This function relies on 'node:crypto' and is intended for Server-Side use only (Node.js).
 * 
 * @param webhookBody The full received webhook body object (including 'sign')
 * @param apiKey Your Merchant API Key
 * @returns true if valid, false otherwise
 */
export function isValidRbxcrateSign(webhookBody: RbxCrateWebhook, apiKey: string): boolean {
  const { sign: receivedSign, ...rest } = webhookBody;
  
  // Best practice: Use the raw request body string from your framework if possible.
  // If you only have the parsed object, this function attempts to reconstruct the string
  // by sorting keys, which is a common convention but not guaranteed if the sender
  // didn't sort them or used a specific order.
  
  const calculatedSign = generateSign(rest, apiKey);

  return receivedSign === calculatedSign;
}
