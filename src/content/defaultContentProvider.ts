import { unlockCatalog } from "./unlocks.catalog.js";
import { controlProfiles } from "./controlProfiles.js";
import { uiText } from "./uiText.js";
import type { ContentProvider } from "../contracts/contentProvider.js";

export const defaultContentProvider: ContentProvider = {
  unlockCatalog: [...unlockCatalog],
  controlProfiles,
  uiText,
};
