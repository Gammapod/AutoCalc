import { keyCatalog } from "./keyCatalog.js";
import { keyRuntimeCatalog } from "./keyRuntimeCatalog.js";
import { unlockCatalog } from "./unlocks.catalog.js";
import { uiText } from "./uiText.js";
import type { ContentProvider } from "../contracts/contentProvider.js";

export const defaultContentProvider: ContentProvider = {
  unlockCatalog: [...unlockCatalog],
  keyCatalog: [...keyCatalog],
  keyRuntimeCatalog: [...keyRuntimeCatalog],
  uiText,
};
