export type ContentProvider = {
  unlockCatalog: import("../domain/types.js").UnlockDefinition[];
  controlProfiles: Record<import("../domain/types.js").CalculatorId, import("../domain/types.js").ControlProfile>;
  uiText: import("./uiText.js").UiText;
};
