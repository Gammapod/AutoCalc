import type { KeyBehaviorKind, KeyHandlerOverrideId } from "./keyCatalog.js";

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
