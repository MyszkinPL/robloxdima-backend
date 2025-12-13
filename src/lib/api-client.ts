import { RbxCrateClient } from "./rbxcrate";
import { getSettings } from "./settings";

export async function getAuthenticatedRbxClient() {
  const settings = await getSettings();

  if (!settings.rbxKey) {
    throw new Error("RBXCrate API key is not configured in settings");
  }

  return new RbxCrateClient(settings.rbxKey);
}
