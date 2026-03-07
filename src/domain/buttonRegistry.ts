import {
  keyRuntimeCatalog,
  type KeyHandlerOverrideId,
  type KeyRuntimeBehaviorKind,
  type KeyRuntimeCatalogEntry,
  type KeyRuntimeUnlockBucket,
} from "../content/keyRuntimeCatalog.js";

export type ButtonUnlockBucket = KeyRuntimeUnlockBucket;
export type ButtonBehaviorKind = KeyRuntimeBehaviorKind;
export type ButtonHandlerOverrideId = KeyHandlerOverrideId;
export type ButtonDefinition = KeyRuntimeCatalogEntry;

// Compatibility adapter: runtime button registry is now sourced from keyRuntimeCatalog.
export const buttonRegistry = keyRuntimeCatalog;

export type ButtonRegistryEntry = (typeof buttonRegistry)[number];
export type ButtonKey = ButtonRegistryEntry["key"];
export type ButtonCategory = ButtonRegistryEntry["category"];
export type RegisteredButtonUnlockBucket = ButtonRegistryEntry["unlockBucket"];
export type ButtonKeyByUnlockBucket<B extends ButtonUnlockBucket> = Extract<ButtonRegistryEntry, { unlockBucket: B }>["key"];
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

export const isExecutionKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"execute"> =>
  getButtonDefinition(key)?.behaviorKind === "execute";

export const isUtilityKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"utility"> =>
  getButtonDefinition(key)?.behaviorKind === "utility";

export const isVisualizerKey = (key: ButtonKey): key is ButtonKeyByBehaviorKind<"visualizer"> =>
  getButtonDefinition(key)?.behaviorKind === "visualizer";

export const getButtonKeysByUnlockBucket = <B extends ButtonUnlockBucket>(bucket: B): ButtonKeyByUnlockBucket<B>[] =>
  buttonRegistry
    .filter((entry): entry is Extract<ButtonRegistryEntry, { unlockBucket: B }> => entry.unlockBucket === bucket)
    .map((entry) => entry.key) as ButtonKeyByUnlockBucket<B>[];
