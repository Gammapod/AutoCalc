export type ButtonUnlockBucket =
  | "valueExpression"
  | "slotOperators"
  | "utilities"
  | "steps"
  | "visualizers"
  | "execution"
  | "none";

export type ButtonBehaviorKind = "digit" | "operator" | "execute" | "utility" | "visualizer" | "toggle" | "noop";

export type ButtonDefinition = {
  key: string;
  category: string;
  unlockBucket: ButtonUnlockBucket;
  defaultUnlocked: boolean;
  supportsPressCount: boolean;
  behaviorKind: ButtonBehaviorKind;
};

export const buttonRegistry = [
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
  { key: "NEG", category: "value_expression", unlockBucket: "valueExpression", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility" },
  { key: "+", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "-", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "*", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "/", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "#", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "\u27E1", category: "slot_operator", unlockBucket: "slotOperators", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "operator" },
  { key: "C", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility" },
  { key: "CE", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility" },
  { key: "UNDO", category: "utility", unlockBucket: "utilities", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "utility" },
  { key: "\u23EF", category: "step", unlockBucket: "steps", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "toggle" },
  { key: "GRAPH", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "FEED", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "CIRCLE", category: "visualizer", unlockBucket: "visualizers", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "visualizer" },
  { key: "=", category: "execution", unlockBucket: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute" },
  { key: "++", category: "execution", unlockBucket: "execution", defaultUnlocked: true, supportsPressCount: true, behaviorKind: "execute" },
  { key: "--", category: "execution", unlockBucket: "execution", defaultUnlocked: false, supportsPressCount: true, behaviorKind: "execute" },
] as const satisfies readonly ButtonDefinition[];

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
