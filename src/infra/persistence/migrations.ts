import { defaultKeyLayout, initialState } from "../../domain/state.js";
import type { DraftingSlot, Key, LayoutCell, PlaceholderCell, Slot, UnlockState, ValueExpressionKey } from "../../domain/types.js";

export type SerializableSlot = {
  operator: Slot["operator"];
  operand: string;
};

export type SerializableStateV1 = {
  calculator?: {
    total?: string;
    pendingNegativeTotal?: boolean;
    roll?: string[];
    euclidRemainders?: Array<{ rollIndex: number; value: string }>;
    operationSlots?: SerializableSlot[];
    draftingSlot?: DraftingSlot | null;
  };
  ui?: {
    keyLayout?: LayoutCell[];
  };
  unlocks?: Partial<UnlockState> & {
    digits?: Partial<Record<Exclude<ValueExpressionKey, "NEG">, boolean>>;
    valueExpression?: Partial<UnlockState["valueExpression"]>;
    slotOperators?: Partial<UnlockState["slotOperators"]>;
    utilities?: Partial<Record<"C" | "CE" | "NEG", boolean>>;
    execution?: Partial<UnlockState["execution"]>;
  };
  completedUnlockIds?: string[];
};

export type SerializableStateV2 = SerializableStateV1;

export type SerializableStateV3 = {
  calculator: {
    total: string;
    pendingNegativeTotal: boolean;
    roll: string[];
    euclidRemainders: Array<{ rollIndex: number; value: string }>;
    operationSlots: SerializableSlot[];
    draftingSlot: DraftingSlot | null;
  };
  ui: {
    keyLayout: LayoutCell[];
  };
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

const RATIONAL_RE = /^\s*-?\d+(?:\s*\/\s*-?\d+)?\s*$/;
const SLOT_OPERATOR_VALUES: Slot["operator"][] = ["+", "-", "*", "/", "#", "⟡"];
const DRAFTING_OPERATOR_VALUES = SLOT_OPERATOR_VALUES;
const DIGIT_VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const VALUE_EXPRESSION_KEY_VALUES = [...DIGIT_VALUES, "NEG"] as const;
const UTILITY_KEY_VALUES = ["C", "CE"] as const;
const EXEC_KEY_VALUES = ["="] as const;
const KEY_VALUES: readonly Key[] = [
  ...VALUE_EXPRESSION_KEY_VALUES,
  ...SLOT_OPERATOR_VALUES,
  ...UTILITY_KEY_VALUES,
  ...EXEC_KEY_VALUES,
];
const MAX_SLOTS_MIN = 1;
const MAX_SLOTS_MAX = 2;
const MAX_TOTAL_DIGITS_MIN = 1;
const MAX_TOTAL_DIGITS_MAX = 12;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isString = (value: unknown): value is string => typeof value === "string";
const isInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);
const isRationalString = (value: unknown): value is string => isString(value) && RATIONAL_RE.test(value);
const isSlotOperator = (value: unknown): value is Slot["operator"] =>
  isString(value) && SLOT_OPERATOR_VALUES.includes(value as Slot["operator"]);
const isKnownKey = (value: unknown): value is Key => isString(value) && KEY_VALUES.includes(value as Key);

const hasOnlyKnownLayoutCells = (layout: unknown): layout is LayoutCell[] =>
  Array.isArray(layout) &&
  layout.every((cell) => {
    if (!isObject(cell) || !isString(cell.kind)) {
      return false;
    }
    if (cell.kind === "placeholder") {
      return (
        isString(cell.area) &&
        ["graph", "empty", "negate", "div", "mod", "mul", "euclid_divmod"].includes(cell.area)
      );
    }
    if (cell.kind === "key") {
      return isKnownKey(cell.key);
    }
    return false;
  });

const isDraftingSlot = (value: unknown): value is DraftingSlot =>
  isObject(value) &&
  isSlotOperator(value.operator) &&
  isString(value.operandInput) &&
  isBoolean(value.isNegative);

const isSerializableSlot = (value: unknown): value is SerializableSlot =>
  isObject(value) && isSlotOperator(value.operator) && isString(value.operand);

const defaultUnlocks = (): UnlockState => initialState().unlocks;

const normalizeUnlockCap = (value: unknown, fallback: number, min: number, max: number): number => {
  if (!isInteger(value) || value < min || value > max) {
    return fallback;
  }
  return value;
};

const normalizeUnlocks = (source?: SerializableStateV2["unlocks"]): UnlockState => {
  const defaults = defaultUnlocks();
  const sourceDigits = source?.digits ?? {};
  const sourceValueExpression = source?.valueExpression ?? {};
  const legacyNegUtility = source?.utilities?.NEG;
  const legacyValueExpressionFromDigits = Object.fromEntries(
    Object.keys(defaults.valueExpression)
      .filter((key) => key !== "NEG")
      .map((digit) => [digit, sourceDigits[digit as keyof typeof sourceDigits]]),
  ) as Partial<Record<Exclude<ValueExpressionKey, "NEG">, boolean>>;
  return {
    valueExpression: {
      ...defaults.valueExpression,
      ...legacyValueExpressionFromDigits,
      ...sourceValueExpression,
      ...(typeof legacyNegUtility === "boolean" ? { NEG: legacyNegUtility } : {}),
    },
    slotOperators: { ...defaults.slotOperators, ...(source?.slotOperators ?? {}) },
    utilities: { ...defaults.utilities, ...(source?.utilities ?? {}) },
    execution: { ...defaults.execution, ...(source?.execution ?? {}) },
    maxSlots: normalizeUnlockCap(source?.maxSlots, defaults.maxSlots, MAX_SLOTS_MIN, MAX_SLOTS_MAX),
    maxTotalDigits: normalizeUnlockCap(
      source?.maxTotalDigits,
      defaults.maxTotalDigits,
      MAX_TOTAL_DIGITS_MIN,
      MAX_TOTAL_DIGITS_MAX,
    ),
  };
};

const normalizeKeyLayout = (layout?: LayoutCell[]): LayoutCell[] => {
  const normalized = [...(layout ?? defaultKeyLayout())];

  const mappings: Array<{ key: Key; area: PlaceholderCell["area"] }> = [
    { key: "NEG", area: "negate" },
    { key: "/", area: "div" },
    { key: "⟡", area: "mod" },
    { key: "*", area: "mul" },
    { key: "#", area: "euclid_divmod" },
  ];

  for (const mapping of mappings) {
    const hasKey = normalized.some((cell) => cell.kind === "key" && cell.key === mapping.key);
    if (hasKey) {
      continue;
    }
    const placeholderIndex = normalized.findIndex(
      (cell) => cell.kind === "placeholder" && cell.area === mapping.area,
    );
    if (placeholderIndex >= 0) {
      normalized[placeholderIndex] = { kind: "key", key: mapping.key };
    }
  }

  return normalized;
};

export const migrateV1ToV2 = (input: SerializableStateV1): SerializableStateV2 => ({ ...input });

export const migrateV2ToV3 = (input: SerializableStateV2): SerializableStateV3 => ({
  calculator: {
    total: input.calculator?.total ?? "0",
    pendingNegativeTotal: input.calculator?.pendingNegativeTotal ?? false,
    roll: input.calculator?.roll ?? [],
    euclidRemainders: input.calculator?.euclidRemainders ?? [],
    operationSlots: input.calculator?.operationSlots ?? [],
    draftingSlot: input.calculator?.draftingSlot ?? null,
  },
  ui: {
    keyLayout: normalizeKeyLayout(input.ui?.keyLayout),
  },
  unlocks: normalizeUnlocks(input.unlocks),
  completedUnlockIds: input.completedUnlockIds ?? [],
});

export const isValidSchemaVersion = (version: unknown): version is 1 | 2 | 3 =>
  version === 1 || version === 2 || version === 3;

export const validateSerializableStateV3 = (state: unknown): state is SerializableStateV3 => {
  if (!isObject(state)) {
    return false;
  }

  if (!isObject(state.calculator) || !isObject(state.ui) || !isObject(state.unlocks)) {
    return false;
  }

  const calculator = state.calculator;
  if (
    !isRationalString(calculator.total) ||
    !isBoolean(calculator.pendingNegativeTotal) ||
    !Array.isArray(calculator.roll) ||
    !calculator.roll.every(isRationalString) ||
    !Array.isArray(calculator.euclidRemainders) ||
    !calculator.euclidRemainders.every(
      (entry) => isObject(entry) && isInteger(entry.rollIndex) && isRationalString(entry.value),
    ) ||
    !Array.isArray(calculator.operationSlots) ||
    !calculator.operationSlots.every(isSerializableSlot) ||
    !(calculator.draftingSlot === null || isDraftingSlot(calculator.draftingSlot))
  ) {
    return false;
  }

  const ui = state.ui;
  if (!hasOnlyKnownLayoutCells(ui.keyLayout)) {
    return false;
  }

  const unlocks = state.unlocks;
  const defaults = defaultUnlocks();
  const hasValidBooleans = <K extends string>(keys: K[], source: unknown): boolean =>
    isObject(source) && keys.every((key) => isBoolean(source[key]));

  if (
    !hasValidBooleans(Object.keys(defaults.valueExpression), unlocks.valueExpression) ||
    !hasValidBooleans(Object.keys(defaults.slotOperators), unlocks.slotOperators) ||
    !hasValidBooleans(Object.keys(defaults.utilities), unlocks.utilities) ||
    !hasValidBooleans(Object.keys(defaults.execution), unlocks.execution) ||
    !isInteger(unlocks.maxSlots) ||
    !isInteger(unlocks.maxTotalDigits)
  ) {
    return false;
  }

  return Array.isArray(state.completedUnlockIds) && state.completedUnlockIds.every(isString);
};

export const migrateToLatest = (schemaVersion: number, state: unknown): SerializableStateV3 | null => {
  if (!isObject(state) || !isValidSchemaVersion(schemaVersion)) {
    return null;
  }

  let v2State: SerializableStateV2;
  if (schemaVersion === 1) {
    v2State = migrateV1ToV2(state as SerializableStateV1);
  } else if (schemaVersion === 2) {
    v2State = state as SerializableStateV2;
  } else {
    const asV3 = state as SerializableStateV3;
    const normalizedV3: SerializableStateV3 = {
      ...asV3,
      unlocks: normalizeUnlocks(asV3.unlocks),
    };
    return validateSerializableStateV3(normalizedV3) ? normalizedV3 : null;
  }

  const v3State = migrateV2ToV3(v2State);
  return validateSerializableStateV3(v3State) ? v3State : null;
};

