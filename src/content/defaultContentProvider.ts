import { unlockCatalog } from "./unlocks.catalog.js";
import { uiText } from "./uiText.js";
import type { ContentProvider } from "../contracts/contentProvider.js";

export const defaultContentProvider: ContentProvider = {
  unlockCatalog: [...unlockCatalog],
  uiText,
};
