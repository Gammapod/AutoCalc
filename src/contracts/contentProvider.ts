export type ContentProvider = {
  unlockCatalog: import("../domain/types.js").UnlockDefinition[];
  keyCatalog: import("./keyCatalog.js").KeyCatalogRecord[];
  keyRuntimeCatalog: import("./keyRuntimeCatalog.js").KeyRuntimeCatalogEntry[];
  uiText: import("./uiText.js").UiText;
};
