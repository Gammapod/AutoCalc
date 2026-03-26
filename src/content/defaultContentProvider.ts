import { unlockCatalog } from "./unlocks.catalog.js";
import { controlProfiles } from "./controlProfiles.js";
import { uiText } from "./uiText.js";
import { keyDiagnostics } from "./diagnostics/keyDescriptions.js";
import { operationDiagnostics } from "./diagnostics/operationDescriptions.js";
import { releaseNotes } from "./releaseNotes.js";
import type { ContentProvider } from "../contracts/contentProvider.js";

export const defaultContentProvider: ContentProvider = {
  unlockCatalog: [...unlockCatalog],
  controlProfiles,
  uiText,
  diagnostics: {
    keys: keyDiagnostics,
    operations: operationDiagnostics,
  },
  releaseNotes,
};
