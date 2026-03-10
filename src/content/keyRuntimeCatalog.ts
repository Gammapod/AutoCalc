import {
  keyCatalog,
  type KeyBehaviorKind,
  type KeyCatalogEntry,
  type KeyHandlerOverrideId,
} from "./keyCatalog.js";

export type KeyRuntimeUnlockBucket =
  | "valueExpression"
  | "slotOperators"
  | "unaryOperators"
  | "utilities"
  | "memory"
  | "steps"
  | "visualizers"
  | "execution"
  | "none";

export type KeyRuntimeBehaviorKind = KeyBehaviorKind;
export type KeyRuntimeCatalogEntry = {
  key: string;
  category: string;
  unlockBucket: KeyRuntimeUnlockBucket;
  defaultUnlocked: boolean;
  supportsPressCount: boolean;
  behaviorKind: KeyRuntimeBehaviorKind;
  handlerOverrideId?: KeyHandlerOverrideId;
};

const toRuntimeUnlockBucket = (entry: KeyCatalogEntry): KeyRuntimeUnlockBucket => {
  if (entry.unlockGroup === "valueAtoms" || entry.unlockGroup === "valueCompose") {
    return "valueExpression";
  }
  if (entry.unlockGroup === "slotOperators") {
    return "slotOperators";
  }
  if (entry.unlockGroup === "unaryOperators") {
    return "unaryOperators";
  }
  if (entry.unlockGroup === "utilities") {
    return "utilities";
  }
  if (entry.unlockGroup === "memory") {
    return "memory";
  }
  if (entry.unlockGroup === "steps") {
    return "steps";
  }
  if (entry.unlockGroup === "visualizers") {
    return "visualizers";
  }
  if (entry.unlockGroup === "execution") {
    return "execution";
  }
  return "none";
};

export const keyRuntimeCatalog = keyCatalog.map((entry) => ({
  key: entry.key,
  category: entry.category,
  unlockBucket: toRuntimeUnlockBucket(entry),
  defaultUnlocked: entry.defaultUnlocked,
  supportsPressCount: entry.supportsPressCount,
  behaviorKind: entry.behaviorKind,
  ...(("handlerOverrideId" in entry && entry.handlerOverrideId) ? { handlerOverrideId: entry.handlerOverrideId } : {}),
})) as readonly KeyRuntimeCatalogEntry[];

export type KeyRuntimeCatalogRecord = (typeof keyRuntimeCatalog)[number];
