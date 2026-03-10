import {
  keyCatalog,
  type KeyCatalogEntry,
  type KeyHandlerOverrideId,
  type KeyBehaviorKind,
  type KeyUnlockGroup,
  type KeyVisualizerId,
} from "../content/keyCatalog.js";

export type ButtonUnlockGroup = KeyUnlockGroup;
export type ButtonBehaviorKind = KeyBehaviorKind;
export type ButtonHandlerOverrideId = KeyHandlerOverrideId;
export type ButtonDefinition = KeyCatalogEntry;

export const buttonRegistry = keyCatalog;

export type ButtonRegistryEntry = (typeof buttonRegistry)[number];
export type ButtonKey = ButtonRegistryEntry["key"];
export type ButtonCategory = ButtonRegistryEntry["category"];
export type ButtonVisualizerId = KeyVisualizerId;
export type RegisteredButtonUnlockGroup = ButtonRegistryEntry["unlockGroup"];
export type ButtonKeyByUnlockGroup<B extends ButtonUnlockGroup> = Extract<ButtonRegistryEntry, { unlockGroup: B }>["key"];
export type ButtonKeyByBehaviorKind<K extends ButtonBehaviorKind> = Extract<ButtonRegistryEntry, { behaviorKind: K }>["key"];

const buttonDefinitionByKey = new Map<ButtonKey, ButtonRegistryEntry>(
  buttonRegistry.map((entry) => [entry.key, entry]),
);

export const getButtonDefinition = (key: ButtonKey): ButtonRegistryEntry | undefined => buttonDefinitionByKey.get(key);

export const isButtonKey = (value: string): value is ButtonKey => buttonDefinitionByKey.has(value as ButtonKey);

export const isDigitKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"digit"> =>
  getButtonDefinition(key)?.behaviorKind === "digit";

export const isOperatorKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"operator"> =>
  getButtonDefinition(key)?.behaviorKind === "operator";

export const isUnaryOperatorKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"unary_operator"> =>
  getButtonDefinition(key)?.behaviorKind === "unary_operator";

export const isExecutionKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"execute"> =>
  getButtonDefinition(key)?.behaviorKind === "execute";

export const isUtilityKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"utility"> =>
  getButtonDefinition(key)?.behaviorKind === "utility";

export const isVisualizerKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"visualizer"> =>
  getButtonDefinition(key)?.behaviorKind === "visualizer";

export const getButtonKeysByUnlockGroup = <B extends ButtonUnlockGroup>(group: B): ButtonKeyByUnlockGroup<B>[] =>
  buttonRegistry
    .filter((entry): entry is Extract<ButtonRegistryEntry, { unlockGroup: B }> => entry.unlockGroup === group)
    .map((entry) => entry.key) as ButtonKeyByUnlockGroup<B>[];

export const keyToVisualizerId = (key: ButtonKey): ButtonVisualizerId | null => {
  const definition = getButtonDefinition(key);
  if (!definition || definition.behaviorKind !== "visualizer") {
    return null;
  }
  return ("visualizerId" in definition ? definition.visualizerId : undefined) ?? null;
};
