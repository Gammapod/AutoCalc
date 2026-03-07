export type KeyRuntimeUnlockBucket =
  | "valueExpression"
  | "slotOperators"
  | "utilities"
  | "steps"
  | "visualizers"
  | "execution"
  | "none";

export type KeyRuntimeBehaviorKind = "digit" | "operator" | "execute" | "utility" | "visualizer" | "toggle" | "noop";

export type KeyHandlerOverrideId =
  | "negate_total_or_drafting"
  | "utility_clear_all"
  | "utility_clear_entry"
  | "utility_undo"
  | "execute_equals"
  | "execute_increment"
  | "execute_decrement";

export type KeyRuntimeCatalogEntry = {
  key: string;
  category: string;
  unlockBucket: KeyRuntimeUnlockBucket;
  defaultUnlocked: boolean;
  supportsPressCount: boolean;
  behaviorKind: KeyRuntimeBehaviorKind;
  handlerOverrideId?: KeyHandlerOverrideId;
};

export const keyRuntimeCatalog = [
  { key: "0", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "1", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "2", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "3", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "4", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "5", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "6", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "7", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "8", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "9", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "digit" },
  { key: "NEG", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", handlerOverrideId: "negate_total_or_drafting" },
  { key: "+", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "-", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "*", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "/", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "#", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "\u27E1", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "C", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", handlerOverrideId: "utility_clear_all" },
  { key: "CE", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", handlerOverrideId: "utility_clear_entry" },
  { key: "UNDO", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility", handlerOverrideId: "utility_undo" },
  { key: "\u23EF", category: "step", unlockBucket: "steps", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle" },
  { key: "GRAPH", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "FEED", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "CIRCLE", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "=", category: "execution", unlockBucket: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute", handlerOverrideId: "execute_equals" },
  { key: "++", category: "execution", unlockBucket: "execution", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "execute", handlerOverrideId: "execute_increment" },
  { key: "--", category: "execution", unlockBucket: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute", handlerOverrideId: "execute_decrement" },
] as const satisfies readonly KeyRuntimeCatalogEntry[];

export type KeyRuntimeCatalogRecord = (typeof keyRuntimeCatalog)[number];
