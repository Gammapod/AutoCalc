import {
  defaultDrawerKeyLayout,
  defaultKeyLayout,
  defaultStorageLayout,
  initialState,
  KEYPAD_DEFAULT_COLUMNS,
  KEYPAD_DEFAULT_ROWS,
  KEYPAD_DIM_MAX,
  KEYPAD_DIM_MIN,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "../../domain/state.js";
import { fromKeyLayoutArray } from "../../domain/keypadLayoutModel.js";
import { resizeKeyLayout } from "../../domain/reducer.layout.js";
import type {
  DraftingSlot,
  Key,
  KeyCell,
  KeypadCellRecord,
  LayoutCell,
  PlaceholderCell,
  Slot,
  UnlockState,
  ValueExpressionKey,
} from "../../domain/types.js";

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
    storageLayout?: KeyCell[];
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
    storageLayout: KeyCell[];
  };
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

export type SerializableStateV4 = {
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
    storageLayout: Array<KeyCell | null>;
  };
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

export type SerializableStateV5 = {
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
    keypadCells?: KeypadCellRecord[];
    storageLayout: Array<KeyCell | null>;
    keypadColumns: number;
    keypadRows: number;
    buttonFlags: Record<string, boolean>;
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
const EXEC_KEY_VALUES = ["=", "\u23EF"] as const;
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
const isBooleanRecord = (value: unknown): value is Record<string, boolean> =>
  isObject(value) && Object.values(value).every(isBoolean);

const normalizeButtonFlags = (value: unknown): Record<string, boolean> => {
  if (!isObject(value)) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (key.trim().length > 0 && isBoolean(enabled)) {
      normalized[key] = enabled;
    }
  }
  return normalized;
};

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

const hasOnlyKnownStorageCells = (layout: unknown): layout is KeyCell[] =>
  Array.isArray(layout) &&
  layout.every(
    (cell) =>
      isObject(cell) &&
      cell.kind === "key" &&
      isKnownKey(cell.key) &&
      (cell.wide === undefined || isBoolean(cell.wide)) &&
      (cell.tall === undefined || isBoolean(cell.tall)),
  );

const hasOnlyKnownStorageSlots = (layout: unknown): layout is Array<KeyCell | null> =>
  Array.isArray(layout) && layout.every((cell) => cell === null || (isObject(cell) && hasOnlyKnownStorageCells([cell])));

const hasOnlyKnownKeypadCells = (cells: unknown): cells is KeypadCellRecord[] =>
  Array.isArray(cells) &&
  cells.every(
    (cell) =>
      isObject(cell) &&
      isString(cell.id) &&
      isInteger(cell.row) &&
      isInteger(cell.col) &&
      cell.row >= 1 &&
      cell.col >= 1 &&
      hasOnlyKnownLayoutCells([cell.cell]),
  );

const isDraftingSlot = (value: unknown): value is DraftingSlot =>
  isObject(value) &&
  isSlotOperator(value.operator) &&
  isString(value.operandInput) &&
  isBoolean(value.isNegative);

const isSerializableSlot = (value: unknown): value is SerializableSlot =>
  isObject(value) && isSlotOperator(value.operator) && isString(value.operand);

const defaultUnlocks = (): UnlockState => initialState().unlocks;

const normalizeKeypadDimension = (value: unknown, fallback: number): number => {
  if (!isInteger(value)) {
    return fallback;
  }
  return Math.max(KEYPAD_DIM_MIN, Math.min(KEYPAD_DIM_MAX, value));
};

const normalizeKeypadLayoutForDimensions = (
  layout: LayoutCell[] | undefined,
  columns: number,
  rows: number,
  sourceColumns?: number,
  sourceRows?: number,
): LayoutCell[] => {
  const normalizedLayout = hasOnlyKnownLayoutCells(layout) ? [...layout] : defaultDrawerKeyLayout(columns, rows);
  const fromColumns = sourceColumns ?? columns;
  const fromRows = sourceRows ?? rows;
  return resizeKeyLayout(normalizedLayout, fromColumns, fromRows, columns, rows);
};

const normalizeStorageSlots = (
  storageLayout: unknown,
  packedFallback: KeyCell[] = [],
): Array<KeyCell | null> => {
  let packed: KeyCell[] = packedFallback;
  if (hasOnlyKnownStorageCells(storageLayout)) {
    packed = storageLayout;
  }

  const nextSlots: Array<KeyCell | null> = hasOnlyKnownStorageSlots(storageLayout)
    ? [...storageLayout]
    : packed.map((cell) => ({ ...cell }));

  const normalizedLength = Math.max(
    STORAGE_INITIAL_SLOTS,
    Math.ceil(nextSlots.length / STORAGE_COLUMNS) * STORAGE_COLUMNS,
  );
  while (nextSlots.length < normalizedLength) {
    nextSlots.push(null);
  }
  if (!nextSlots.some((cell) => cell === null)) {
    for (let index = 0; index < STORAGE_COLUMNS; index += 1) {
      nextSlots.push(null);
    }
  }
  return nextSlots;
};

const collectLayoutKeys = (layout: LayoutCell[]): Set<Key> => {
  const keys = new Set<Key>();
  for (const cell of layout) {
    if (cell.kind === "key") {
      keys.add(cell.key);
    }
  }
  return keys;
};

const collectOverflowStorageCandidates = (
  layout: LayoutCell[],
  keepLength: number,
  disallowedKeys: Set<Key>,
): KeyCell[] => {
  const overflow: KeyCell[] = [];
  for (const cell of layout.slice(keepLength)) {
    if (cell.kind !== "key") {
      continue;
    }
    if (disallowedKeys.has(cell.key)) {
      continue;
    }
    disallowedKeys.add(cell.key);
    overflow.push({ kind: "key", key: cell.key });
  }
  return overflow;
};

const appendKeysIntoStorage = (storageLayout: Array<KeyCell | null>, keys: KeyCell[]): Array<KeyCell | null> => {
  const nextStorage = [...storageLayout];
  for (const keyCell of keys) {
    const emptyIndex = nextStorage.findIndex((cell) => cell === null);
    if (emptyIndex >= 0) {
      nextStorage[emptyIndex] = keyCell;
      continue;
    }
    nextStorage.push(keyCell);
  }
  return nextStorage;
};

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
    storageLayout: hasOnlyKnownStorageCells(input.ui?.storageLayout) ? input.ui.storageLayout : [],
  },
  unlocks: normalizeUnlocks(input.unlocks),
  completedUnlockIds: input.completedUnlockIds ?? [],
});

export const migrateV3ToV4 = (input: SerializableStateV3): SerializableStateV4 => ({
  ...input,
  ui: {
    keyLayout: normalizeKeyLayout(input.ui.keyLayout),
    storageLayout: normalizeStorageSlots(input.ui.storageLayout, input.ui.storageLayout),
  },
});

export const migrateV4ToV5 = (input: SerializableStateV4): SerializableStateV5 => {
  const keypadColumns = KEYPAD_DEFAULT_COLUMNS;
  const keypadRows = KEYPAD_DEFAULT_ROWS;
  const targetLength = Math.max(1, keypadColumns * keypadRows);
  const normalizedKeyLayout = normalizeKeypadLayoutForDimensions(input.ui.keyLayout, keypadColumns, keypadRows);
  const existingStorageSlots = normalizeStorageSlots(input.ui.storageLayout);
  const knownKeys = new Set<Key>([
    ...collectLayoutKeys(normalizedKeyLayout),
    ...existingStorageSlots.flatMap((cell) => (cell?.kind === "key" ? [cell.key] : [])),
  ]);
  const overflowKeys = collectOverflowStorageCandidates(input.ui.keyLayout, targetLength, knownKeys);
  const storageLayout = normalizeStorageSlots(appendKeysIntoStorage(existingStorageSlots, overflowKeys));
  return {
    ...input,
    ui: {
      keyLayout: normalizedKeyLayout,
      keypadCells: fromKeyLayoutArray(normalizedKeyLayout, keypadColumns, keypadRows),
      storageLayout,
      keypadColumns,
      keypadRows,
      buttonFlags: {},
    },
  };
};

export const isValidSchemaVersion = (version: unknown): version is 1 | 2 | 3 | 4 | 5 =>
  version === 1 || version === 2 || version === 3 || version === 4 || version === 5;

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
  if (!hasOnlyKnownLayoutCells(ui.keyLayout) || !hasOnlyKnownStorageCells(ui.storageLayout)) {
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

export const validateSerializableStateV4 = (state: unknown): state is SerializableStateV4 => {
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
  if (!hasOnlyKnownLayoutCells(ui.keyLayout) || !hasOnlyKnownStorageSlots(ui.storageLayout)) {
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

export const validateSerializableStateV5 = (state: unknown): state is SerializableStateV5 => {
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
  if (
    !hasOnlyKnownLayoutCells(ui.keyLayout) ||
    (ui.keypadCells !== undefined && !hasOnlyKnownKeypadCells(ui.keypadCells)) ||
    !hasOnlyKnownStorageSlots(ui.storageLayout) ||
    !isInteger(ui.keypadColumns) ||
    !isInteger(ui.keypadRows) ||
    !isBooleanRecord(ui.buttonFlags)
  ) {
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

export const migrateToLatest = (schemaVersion: number, state: unknown): SerializableStateV5 | null => {
  if (!isObject(state) || !isValidSchemaVersion(schemaVersion)) {
    return null;
  }

  let v2State: SerializableStateV2;
  if (schemaVersion === 1) {
    v2State = migrateV1ToV2(state as SerializableStateV1);
  } else if (schemaVersion === 2) {
    v2State = state as SerializableStateV2;
  } else if (schemaVersion === 3) {
    const asV3 = state as SerializableStateV3;
    const normalizedV3: SerializableStateV3 = {
      ...asV3,
      ui: {
        keyLayout: asV3.ui?.keyLayout ?? defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: hasOnlyKnownStorageCells(asV3.ui?.storageLayout) ? asV3.ui.storageLayout : [],
      },
      unlocks: normalizeUnlocks(asV3.unlocks),
    };
    if (!validateSerializableStateV3(normalizedV3)) {
      return null;
    }
    return migrateV4ToV5(migrateV3ToV4(normalizedV3));
  } else if (schemaVersion === 4) {
    const asV4 = state as SerializableStateV4;
    const normalizedV4: SerializableStateV4 = {
      ...asV4,
      ui: {
        keyLayout: asV4.ui?.keyLayout ?? defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV4.ui?.storageLayout ?? defaultStorageLayout()),
      },
      unlocks: normalizeUnlocks(asV4.unlocks),
    };
    if (!validateSerializableStateV4(normalizedV4)) {
      return null;
    }
    return migrateV4ToV5(normalizedV4);
  } else {
    const asV5 = state as SerializableStateV5;
    if (!hasOnlyKnownLayoutCells(asV5.ui?.keyLayout) || !hasOnlyKnownStorageSlots(asV5.ui?.storageLayout)) {
      return null;
    }
    const keypadColumns = normalizeKeypadDimension(asV5.ui?.keypadColumns, KEYPAD_DEFAULT_COLUMNS);
    const keypadRows = normalizeKeypadDimension(asV5.ui?.keypadRows, KEYPAD_DEFAULT_ROWS);
    const targetLength = Math.max(1, keypadColumns * keypadRows);
    const normalizedKeyLayout = normalizeKeypadLayoutForDimensions(
      asV5.ui.keyLayout,
      keypadColumns,
      keypadRows,
      keypadColumns,
      keypadRows,
    );
    const existingStorageSlots = normalizeStorageSlots(asV5.ui.storageLayout);
    const knownKeys = new Set<Key>([
      ...collectLayoutKeys(normalizedKeyLayout),
      ...existingStorageSlots.flatMap((cell) => (cell?.kind === "key" ? [cell.key] : [])),
    ]);
    const overflowKeys = collectOverflowStorageCandidates(asV5.ui.keyLayout, targetLength, knownKeys);
    const storageLayout = normalizeStorageSlots(appendKeysIntoStorage(existingStorageSlots, overflowKeys));
    const normalizedV5: SerializableStateV5 = {
      ...asV5,
      ui: {
        keyLayout: normalizedKeyLayout,
        keypadCells: fromKeyLayoutArray(normalizedKeyLayout, keypadColumns, keypadRows),
        storageLayout,
        keypadColumns,
        keypadRows,
        buttonFlags: normalizeButtonFlags(asV5.ui.buttonFlags),
      },
      unlocks: normalizeUnlocks(asV5.unlocks),
    };
    return validateSerializableStateV5(normalizedV5) ? normalizedV5 : null;
  }

  const v3State = migrateV2ToV3(v2State);
  if (!validateSerializableStateV3(v3State)) {
    return null;
  }
  return migrateV4ToV5(migrateV3ToV4(v3State));
};

