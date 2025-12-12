import { RbxCrateClient } from "./rbxcrate";
import { getSettings } from "./settings";

const apiKey = process.env.RBXCRATE_API_KEY || "YOUR_API_KEY_HERE";

/**
 * @deprecated Use getAuthenticatedRbxClient() instead to ensure settings are loaded
 */
export const rbxClient = new RbxCrateClient(apiKey);

export async function getAuthenticatedRbxClient() {
  const settings = await getSettings();
  const key = settings.rbxKey || process.env.RBXCRATE_API_KEY || "";
  return new RbxCrateClient(key);
}
