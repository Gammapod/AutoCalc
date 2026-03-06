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
  ActiveVisualizer,
  DraftingSlot,
  ErrorCode,
  ExecutionErrorKind,
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
    utilities?: Partial<Record<"C" | "CE" | "UNDO" | "GRAPH" | "\u23EF" | "NEG", boolean>>;
    visualizers?: Partial<UnlockState["visualizers"]>;
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
    singleDigitInitialTotalEntry?: boolean;
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

export type SerializableStateV6 = {
  calculator: SerializableStateV5["calculator"];
  ui: SerializableStateV5["ui"];
  keyPressCounts: Partial<Record<Key, number>>;
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

export type SerializableRollErrorEntry = {
  rollIndex: number;
  code: ErrorCode;
  kind: ExecutionErrorKind;
};

export type SerializableStateV7 = {
  calculator: {
    total: string;
    pendingNegativeTotal: boolean;
    singleDigitInitialTotalEntry?: boolean;
    roll: string[];
    rollErrors: SerializableRollErrorEntry[];
    euclidRemainders: Array<{ rollIndex: number; value: string }>;
    operationSlots: SerializableSlot[];
    draftingSlot: DraftingSlot | null;
  };
  ui: SerializableStateV5["ui"];
  keyPressCounts: Partial<Record<Key, number>>;
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

export type SerializableAllocatorStateV8 = {
  points: number;
  speed: number;
};

export type SerializableStateV8 = SerializableStateV7 & {
  allocator: SerializableAllocatorStateV8;
};

export type SerializableAllocatorStateV9 = {
  maxPoints: number;
  allocations: {
    width: number;
    height: number;
    range: number;
    speed: number;
  };
};

export type SerializableStateV9 = SerializableStateV7 & {
  allocator: SerializableAllocatorStateV9;
};

export type SerializableAllocatorStateV10 = {
  maxPoints: number;
  allocations: {
    width: number;
    height: number;
    range: number;
    speed: number;
    slots: number;
  };
};

export type SerializableStateV10 = SerializableStateV7 & {
  allocator: SerializableAllocatorStateV10;
  allocatorReturnPressCount?: number;
  allocatorAllocatePressCount?: number;
};

export type SerializableStateV11 = SerializableStateV10 & {
  ui: SerializableStateV10["ui"] & {
    activeVisualizer: ActiveVisualizer;
  };
};

export type SerializableStateV12 = SerializableStateV11;

export type SerializableRollEntryV13 = {
  y: string;
  remainder?: string;
  error?: SerializableRollErrorEntry;
};

export type SerializableStateV13 = Omit<SerializableStateV12, "calculator"> & {
  calculator: Omit<SerializableStateV12["calculator"], "roll" | "rollErrors" | "euclidRemainders"> & {
    rollEntries: SerializableRollEntryV13[];
  };
};

const RATIONAL_RE = /^\s*-?\d+(?:\s*\/\s*-?\d+)?\s*$/;
const CALCULATOR_VALUE_RE = /^(?:\s*-?\d+(?:\s*\/\s*-?\d+)?\s*|NaN)$/;
const SLOT_OPERATOR_VALUES: Slot["operator"][] = ["+", "-", "*", "/", "#", "⟡"];
const DRAFTING_OPERATOR_VALUES = SLOT_OPERATOR_VALUES;
const DIGIT_VALUES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const VALUE_EXPRESSION_KEY_VALUES = [...DIGIT_VALUES, "NEG"] as const;
const UTILITY_KEY_VALUES = ["C", "CE", "UNDO"] as const;
const STEP_KEY_VALUES = ["\u23EF"] as const;
const VISUALIZER_KEY_VALUES = ["GRAPH", "FEED", "CIRCLE"] as const;
const EXEC_KEY_VALUES = ["=", "++", "--"] as const;
const KEY_VALUES: readonly Key[] = [
  ...VALUE_EXPRESSION_KEY_VALUES,
  ...SLOT_OPERATOR_VALUES,
  ...UTILITY_KEY_VALUES,
  ...STEP_KEY_VALUES,
  ...VISUALIZER_KEY_VALUES,
  ...EXEC_KEY_VALUES,
];
const ERROR_CODE_VALUES: readonly ErrorCode[] = [
  "x∉[-R,R]",
  "n/0",
  "NaN",
];
const EXECUTION_ERROR_KIND_VALUES: readonly ExecutionErrorKind[] = [
  "overflow",
  "division_by_zero",
  "nan_input",
];
const LEGACY_GRAPH_VISIBLE_FLAG = "graph.visible";
const LEGACY_FEED_VISIBLE_FLAG = "feed.visible";
const MAX_SLOTS_MIN = 0;
const MAX_SLOTS_MAX = 4;
const MAX_TOTAL_DIGITS_MIN = 1;
const MAX_TOTAL_DIGITS_MAX = 12;
const ALLOCATOR_MIN = 0;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isString = (value: unknown): value is string => typeof value === "string";
const isInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);
const isRationalString = (value: unknown): value is string => isString(value) && RATIONAL_RE.test(value);
const isCalculatorValueString = (value: unknown): value is string => isString(value) && CALCULATOR_VALUE_RE.test(value);
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

const withDefaultButtonFlags = (flags: Record<string, boolean>): Record<string, boolean> => ({ ...flags });

const stripLegacyVisualizerFlags = (flags: Record<string, boolean>): Record<string, boolean> => {
  const next = { ...flags };
  delete next[LEGACY_GRAPH_VISIBLE_FLAG];
  delete next[LEGACY_FEED_VISIBLE_FLAG];
  return next;
};

const resolveLegacyActiveVisualizerFromFlags = (flags: Record<string, boolean>): ActiveVisualizer => {
  if (Boolean(flags[LEGACY_GRAPH_VISIBLE_FLAG])) {
    return "graph";
  }
  if (Boolean(flags[LEGACY_FEED_VISIBLE_FLAG])) {
    return "feed";
  }
  return "total";
};

const normalizeActiveVisualizer = (value: unknown, flags: Record<string, boolean>): ActiveVisualizer => {
  if (value === "none") {
    return "total";
  }
  if (value === "total" || value === "graph" || value === "feed" || value === "circle") {
    return value;
  }
  return resolveLegacyActiveVisualizerFromFlags(flags);
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
    steps: {
      ...defaults.steps,
      ...(source?.steps ?? {}),
      ...(typeof source?.utilities?.["\u23EF"] === "boolean" ? { "\u23EF": source.utilities["\u23EF"] } : {}),
    },
    visualizers: {
      ...defaults.visualizers,
      ...(source?.visualizers ?? {}),
      ...(typeof source?.utilities?.GRAPH === "boolean" ? { GRAPH: source.utilities.GRAPH } : {}),
    },
    execution: { ...defaults.execution, ...(source?.execution ?? {}) },
    uiUnlocks: { ...defaults.uiUnlocks, ...(source?.uiUnlocks ?? {}) },
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
      buttonFlags: withDefaultButtonFlags({}),
    },
    calculator: {
      ...input.calculator,
      singleDigitInitialTotalEntry: false,
    },
  };
};

export const migrateV5ToV6 = (input: SerializableStateV5, resetForLegacy: boolean = false): SerializableStateV6 => {
  if (resetForLegacy) {
    const defaults = initialState();
    return {
      calculator: {
        total: "0",
        pendingNegativeTotal: false,
        singleDigitInitialTotalEntry: false,
        roll: [],
        euclidRemainders: [],
        operationSlots: [],
        draftingSlot: null,
      },
      ui: {
        keyLayout: defaults.ui.keyLayout,
        keypadCells: defaults.ui.keypadCells,
        storageLayout: defaults.ui.storageLayout,
        keypadColumns: defaults.ui.keypadColumns,
        keypadRows: defaults.ui.keypadRows,
        buttonFlags: defaults.ui.buttonFlags,
      },
      keyPressCounts: {},
      unlocks: defaults.unlocks,
      completedUnlockIds: [],
    };
  }

  return {
    calculator: input.calculator,
    ui: input.ui,
    keyPressCounts: {},
    unlocks: input.unlocks,
    completedUnlockIds: input.completedUnlockIds,
  };
};

const normalizeAllocatorV8 = (source: unknown): SerializableAllocatorStateV8 => {
  const defaults = { points: 1, speed: 1 };
  if (!isObject(source)) {
    return defaults;
  }
  const points = isInteger(source.points) && source.points >= ALLOCATOR_MIN ? source.points : defaults.points;
  const speed = isInteger(source.speed) && source.speed >= ALLOCATOR_MIN ? source.speed : defaults.speed;
  return { points, speed };
};

const trimAllocationsToBudget = (allocator: SerializableAllocatorStateV9): SerializableAllocatorStateV9 => {
  const allocations = { ...allocator.allocations };
  let overspend =
    allocations.width + allocations.height + allocations.range + allocations.speed - allocator.maxPoints;
  if (overspend <= 0) {
    return allocator;
  }
  for (const field of ["speed", "range", "height", "width"] as const) {
    if (overspend <= 0) {
      break;
    }
    const reduction = Math.min(allocations[field], overspend);
    allocations[field] -= reduction;
    overspend -= reduction;
  }
  return {
    ...allocator,
    allocations,
  };
};

const trimAllocationsToBudgetV10 = (allocator: SerializableAllocatorStateV10): SerializableAllocatorStateV10 => {
  const allocations = { ...allocator.allocations };
  let overspend =
    allocations.width + allocations.height + allocations.range + allocations.speed + allocations.slots - allocator.maxPoints;
  if (overspend <= 0) {
    return allocator;
  }
  for (const field of ["speed", "range", "slots", "height", "width"] as const) {
    if (overspend <= 0) {
      break;
    }
    const reduction = Math.min(allocations[field], overspend);
    allocations[field] -= reduction;
    overspend -= reduction;
  }
  return {
    ...allocator,
    allocations,
  };
};

const normalizeAllocatorV9 = (source: unknown): SerializableAllocatorStateV9 => {
  const defaults = initialState().allocator;
  if (!isObject(source)) {
    return defaults;
  }
  const allocationsSource = isObject(source.allocations) ? source.allocations : {};
  const normalized: SerializableAllocatorStateV9 = {
    maxPoints: isInteger(source.maxPoints) && source.maxPoints >= ALLOCATOR_MIN ? source.maxPoints : defaults.maxPoints,
    allocations: {
      width:
        isInteger(allocationsSource.width) && allocationsSource.width >= ALLOCATOR_MIN
          ? allocationsSource.width
          : defaults.allocations.width,
      height:
        isInteger(allocationsSource.height) && allocationsSource.height >= ALLOCATOR_MIN
          ? allocationsSource.height
          : defaults.allocations.height,
      range:
        isInteger(allocationsSource.range) && allocationsSource.range >= ALLOCATOR_MIN
          ? allocationsSource.range
          : defaults.allocations.range,
      speed:
        isInteger(allocationsSource.speed) && allocationsSource.speed >= ALLOCATOR_MIN
          ? allocationsSource.speed
          : defaults.allocations.speed,
    },
  };
  return trimAllocationsToBudget(normalized);
};

const normalizeAllocatorV10 = (source: unknown): SerializableAllocatorStateV10 => {
  const defaults = initialState().allocator;
  if (!isObject(source)) {
    return defaults;
  }
  const allocationsSource = isObject(source.allocations) ? source.allocations : {};
  const normalized: SerializableAllocatorStateV10 = {
    maxPoints: isInteger(source.maxPoints) && source.maxPoints >= ALLOCATOR_MIN ? source.maxPoints : defaults.maxPoints,
    allocations: {
      width:
        isInteger(allocationsSource.width) && allocationsSource.width >= ALLOCATOR_MIN
          ? allocationsSource.width
          : defaults.allocations.width,
      height:
        isInteger(allocationsSource.height) && allocationsSource.height >= ALLOCATOR_MIN
          ? allocationsSource.height
          : defaults.allocations.height,
      range:
        isInteger(allocationsSource.range) && allocationsSource.range >= ALLOCATOR_MIN
          ? allocationsSource.range
          : defaults.allocations.range,
      speed:
        isInteger(allocationsSource.speed) && allocationsSource.speed >= ALLOCATOR_MIN
          ? allocationsSource.speed
          : defaults.allocations.speed,
      slots:
        isInteger(allocationsSource.slots) && allocationsSource.slots >= ALLOCATOR_MIN
          ? allocationsSource.slots
          : defaults.allocations.slots,
    },
  };
  return trimAllocationsToBudgetV10(normalized);
};

export const migrateV6ToV7 = (input: SerializableStateV6): SerializableStateV7 => ({
  calculator: {
    ...input.calculator,
    rollErrors: [],
  },
  ui: input.ui,
  keyPressCounts: input.keyPressCounts,
  unlocks: input.unlocks,
  completedUnlockIds: input.completedUnlockIds,
});

export const migrateV7ToV8 = (input: SerializableStateV7): SerializableStateV8 => ({
  ...input,
  allocator: normalizeAllocatorV8(undefined),
});

export const migrateV8ToV9 = (input: SerializableStateV8): SerializableStateV9 => {
  const widthAlloc = Math.max(ALLOCATOR_MIN, input.ui.keypadColumns - 1);
  const heightAlloc = Math.max(ALLOCATOR_MIN, input.ui.keypadRows - 1);
  const rangeAlloc = Math.max(ALLOCATOR_MIN, input.unlocks.maxTotalDigits - 1);
  const speedAlloc = Math.max(ALLOCATOR_MIN, input.allocator.speed - 1);
  const unusedPoints = Math.max(ALLOCATOR_MIN, input.allocator.points);
  const maxPoints = unusedPoints + widthAlloc + heightAlloc + rangeAlloc + speedAlloc;
  return {
    ...input,
    allocator: normalizeAllocatorV9({
      maxPoints,
      allocations: {
        width: widthAlloc,
        height: heightAlloc,
        range: rangeAlloc,
        speed: speedAlloc,
      },
    }),
  };
};

export const migrateV9ToV10 = (input: SerializableStateV9): SerializableStateV10 => {
  const projectedSlots = Math.max(0, Math.min(4, input.unlocks.maxSlots));
  return {
    ...input,
    allocatorReturnPressCount: 0,
    allocatorAllocatePressCount: 0,
    allocator: normalizeAllocatorV10({
      maxPoints: input.allocator.maxPoints + projectedSlots,
      allocations: {
        ...input.allocator.allocations,
        slots: projectedSlots,
      },
    }),
    unlocks: {
      ...input.unlocks,
      maxSlots: projectedSlots,
    },
  };
};

export const migrateV10ToV11 = (input: SerializableStateV10): SerializableStateV11 => {
  const buttonFlags = withDefaultButtonFlags(normalizeButtonFlags(input.ui.buttonFlags));
  return {
    ...input,
    ui: {
      ...input.ui,
      buttonFlags: stripLegacyVisualizerFlags(buttonFlags),
      activeVisualizer: normalizeActiveVisualizer(undefined, buttonFlags),
    },
  };
};

export const migrateV11ToV12 = (input: SerializableStateV11): SerializableStateV12 => ({
  ...input,
  ui: {
    ...input.ui,
    activeVisualizer: normalizeActiveVisualizer(input.ui.activeVisualizer, input.ui.buttonFlags),
  },
});

export const migrateV12ToV13 = (input: SerializableStateV12): SerializableStateV13 => {
  const remainderByRollIndex = new Map<number, string>();
  for (const remainder of input.calculator.euclidRemainders) {
    if (!Number.isInteger(remainder.rollIndex) || remainder.rollIndex < 0) {
      continue;
    }
    remainderByRollIndex.set(remainder.rollIndex, remainder.value);
  }
  const errorByRollIndex = new Map<number, SerializableRollErrorEntry>();
  for (const error of input.calculator.rollErrors) {
    if (!Number.isInteger(error.rollIndex) || error.rollIndex < 0) {
      continue;
    }
    errorByRollIndex.set(error.rollIndex, error);
  }

  const rollEntries: SerializableRollEntryV13[] = input.calculator.roll.map((value, index) => {
    const remainder = remainderByRollIndex.get(index);
    const error = errorByRollIndex.get(index);
    return {
      y: value,
      ...(remainder ? { remainder } : {}),
      ...(error ? { error } : {}),
    };
  });

  return {
    ...input,
    calculator: {
      total: input.calculator.total,
      pendingNegativeTotal: input.calculator.pendingNegativeTotal,
      singleDigitInitialTotalEntry: input.calculator.singleDigitInitialTotalEntry,
      rollEntries,
      operationSlots: input.calculator.operationSlots,
      draftingSlot: input.calculator.draftingSlot,
    },
  };
};

const toSerializableInitialV10 = (): SerializableStateV10 => {
  const defaults = initialState();
  return {
    calculator: {
      total: "0",
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: false,
      roll: [],
      rollErrors: [],
      euclidRemainders: [],
      operationSlots: [],
      draftingSlot: null,
    },
    ui: {
      keyLayout: defaults.ui.keyLayout,
      keypadCells: defaults.ui.keypadCells,
      storageLayout: defaults.ui.storageLayout,
      keypadColumns: defaults.ui.keypadColumns,
      keypadRows: defaults.ui.keypadRows,
      buttonFlags: defaults.ui.buttonFlags,
    },
    keyPressCounts: {},
    allocatorReturnPressCount: 0,
    allocatorAllocatePressCount: 0,
    unlocks: defaults.unlocks,
    completedUnlockIds: [],
    allocator: defaults.allocator,
  };
};

const toSerializableInitialV11 = (): SerializableStateV11 => {
  const v10 = toSerializableInitialV10();
  return {
    ...v10,
    ui: {
      ...v10.ui,
      activeVisualizer: "total",
    },
  };
};

const toSerializableInitialV12 = (): SerializableStateV12 => migrateV11ToV12(toSerializableInitialV11());
const toSerializableInitialV13 = (): SerializableStateV13 => migrateV12ToV13(toSerializableInitialV12());

export const isValidSchemaVersion = (version: unknown): version is 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 =>
  version === 1 ||
  version === 2 ||
  version === 3 ||
  version === 4 ||
  version === 5 ||
  version === 6 ||
  version === 7 ||
  version === 8 ||
  version === 9 ||
  version === 10 ||
  version === 11 ||
  version === 12 ||
  version === 13;

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
    (calculator.singleDigitInitialTotalEntry !== undefined && !isBoolean(calculator.singleDigitInitialTotalEntry)) ||
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
    !hasValidBooleans(Object.keys(defaults.steps), unlocks.steps) ||
    !hasValidBooleans(Object.keys(defaults.visualizers), unlocks.visualizers) ||
    !hasValidBooleans(Object.keys(defaults.execution), unlocks.execution) ||
    !hasValidBooleans(Object.keys(defaults.uiUnlocks), unlocks.uiUnlocks) ||
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
    !hasValidBooleans(Object.keys(defaults.steps), unlocks.steps) ||
    !hasValidBooleans(Object.keys(defaults.visualizers), unlocks.visualizers) ||
    !hasValidBooleans(Object.keys(defaults.execution), unlocks.execution) ||
    !hasValidBooleans(Object.keys(defaults.uiUnlocks), unlocks.uiUnlocks) ||
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
    !hasValidBooleans(Object.keys(defaults.steps), unlocks.steps) ||
    !hasValidBooleans(Object.keys(defaults.visualizers), unlocks.visualizers) ||
    !hasValidBooleans(Object.keys(defaults.execution), unlocks.execution) ||
    !hasValidBooleans(Object.keys(defaults.uiUnlocks), unlocks.uiUnlocks) ||
    !isInteger(unlocks.maxSlots) ||
    !isInteger(unlocks.maxTotalDigits)
  ) {
    return false;
  }

  return Array.isArray(state.completedUnlockIds) && state.completedUnlockIds.every(isString);
};

export const validateSerializableStateV6 = (state: unknown): state is SerializableStateV6 => {
  if (!isObject(state)) {
    return false;
  }
  if (!validateSerializableStateV5(state)) {
    return false;
  }
  const withCounters = state as SerializableStateV6;
  if (!isObject(withCounters.keyPressCounts)) {
    return false;
  }
  return Object.entries(withCounters.keyPressCounts).every(
    ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
  );
};

const isRollErrorEntry = (value: unknown): value is SerializableRollErrorEntry =>
  isObject(value) &&
  isInteger(value.rollIndex) &&
  value.rollIndex >= 0 &&
  isString(value.code) &&
  ERROR_CODE_VALUES.includes(value.code as ErrorCode) &&
  isString(value.kind) &&
  EXECUTION_ERROR_KIND_VALUES.includes(value.kind as ExecutionErrorKind);

const isSerializableRollEntryV13 = (value: unknown): value is SerializableRollEntryV13 =>
  isObject(value) &&
  isCalculatorValueString(value.y) &&
  (value.remainder === undefined || isRationalString(value.remainder)) &&
  (value.error === undefined || isRollErrorEntry({ ...value.error, rollIndex: 0 }));

export const validateSerializableStateV7 = (state: unknown): state is SerializableStateV7 => {
  if (!isObject(state) || !isObject(state.calculator) || !isObject(state.ui) || !isObject(state.unlocks)) {
    return false;
  }

  const calculator = state.calculator;
  if (
    !isCalculatorValueString(calculator.total) ||
    !isBoolean(calculator.pendingNegativeTotal) ||
    !Array.isArray(calculator.roll) ||
    !calculator.roll.every(isCalculatorValueString) ||
    !Array.isArray(calculator.rollErrors) ||
    !calculator.rollErrors.every(isRollErrorEntry) ||
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

  const asV7 = state as SerializableStateV7;
  const shadowV6: SerializableStateV6 = {
    calculator: {
      total: "0",
      pendingNegativeTotal: asV7.calculator.pendingNegativeTotal,
      singleDigitInitialTotalEntry: asV7.calculator.singleDigitInitialTotalEntry,
      roll: [],
      euclidRemainders: asV7.calculator.euclidRemainders,
      operationSlots: asV7.calculator.operationSlots,
      draftingSlot: asV7.calculator.draftingSlot,
    },
    ui: asV7.ui,
    keyPressCounts: asV7.keyPressCounts,
    unlocks: asV7.unlocks,
    completedUnlockIds: asV7.completedUnlockIds,
  };
  return validateSerializableStateV6(shadowV6);
};

export const validateSerializableStateV8 = (state: unknown): state is SerializableStateV8 => {
  if (!isObject(state) || !validateSerializableStateV7(state)) {
    return false;
  }
  const allocator = (state as SerializableStateV8).allocator;
  return (
    isObject(allocator) &&
    isInteger(allocator.points) &&
    allocator.points >= ALLOCATOR_MIN &&
    isInteger(allocator.speed) &&
    allocator.speed >= ALLOCATOR_MIN
  );
};

export const validateSerializableStateV9 = (state: unknown): state is SerializableStateV9 => {
  if (!isObject(state) || !validateSerializableStateV7(state)) {
    return false;
  }
  const allocator = (state as SerializableStateV9).allocator;
  if (
    !isObject(allocator) ||
    !isInteger(allocator.maxPoints) ||
    allocator.maxPoints < ALLOCATOR_MIN ||
    !isObject(allocator.allocations)
  ) {
    return false;
  }
  const allocations = allocator.allocations;
  if (
    !isInteger(allocations.width) ||
    allocations.width < ALLOCATOR_MIN ||
    !isInteger(allocations.height) ||
    allocations.height < ALLOCATOR_MIN ||
    !isInteger(allocations.range) ||
    allocations.range < ALLOCATOR_MIN ||
    !isInteger(allocations.speed) ||
    allocations.speed < ALLOCATOR_MIN
  ) {
    return false;
  }
  const spent = allocations.width + allocations.height + allocations.range + allocations.speed;
  return spent <= allocator.maxPoints;
};

export const validateSerializableStateV10 = (state: unknown): state is SerializableStateV10 => {
  if (!isObject(state) || !validateSerializableStateV7(state)) {
    return false;
  }
  const allocatorReturnPressCount = (state as SerializableStateV10).allocatorReturnPressCount;
  const allocatorAllocatePressCount = (state as SerializableStateV10).allocatorAllocatePressCount;
  if (
    allocatorReturnPressCount !== undefined
    && (!isInteger(allocatorReturnPressCount) || allocatorReturnPressCount < 0)
  ) {
    return false;
  }
  if (
    allocatorAllocatePressCount !== undefined
    && (!isInteger(allocatorAllocatePressCount) || allocatorAllocatePressCount < 0)
  ) {
    return false;
  }
  const allocator = (state as SerializableStateV10).allocator;
  if (
    !isObject(allocator) ||
    !isInteger(allocator.maxPoints) ||
    allocator.maxPoints < ALLOCATOR_MIN ||
    !isObject(allocator.allocations)
  ) {
    return false;
  }
  const allocations = allocator.allocations;
  if (
    !isInteger(allocations.width) ||
    allocations.width < ALLOCATOR_MIN ||
    !isInteger(allocations.height) ||
    allocations.height < ALLOCATOR_MIN ||
    !isInteger(allocations.range) ||
    allocations.range < ALLOCATOR_MIN ||
    !isInteger(allocations.speed) ||
    allocations.speed < ALLOCATOR_MIN ||
    !isInteger(allocations.slots) ||
    allocations.slots < ALLOCATOR_MIN
  ) {
    return false;
  }
  const spent = allocations.width + allocations.height + allocations.range + allocations.speed + allocations.slots;
  return spent <= allocator.maxPoints;
};

export const validateSerializableStateV11 = (state: unknown): state is SerializableStateV11 => {
  if (!isObject(state) || !validateSerializableStateV10(state)) {
    return false;
  }
  return (state as SerializableStateV11).ui.activeVisualizer !== undefined
    && normalizeActiveVisualizer((state as SerializableStateV11).ui.activeVisualizer, {}) === (state as SerializableStateV11).ui.activeVisualizer;
};

export const validateSerializableStateV12 = (state: unknown): state is SerializableStateV12 =>
  validateSerializableStateV11(state);

export const validateSerializableStateV13 = (state: unknown): state is SerializableStateV13 => {
  if (!isObject(state) || !isObject(state.calculator)) {
    return false;
  }

  const calculator = state.calculator;
  if (
    !isCalculatorValueString(calculator.total) ||
    !isBoolean(calculator.pendingNegativeTotal) ||
    (calculator.singleDigitInitialTotalEntry !== undefined && !isBoolean(calculator.singleDigitInitialTotalEntry)) ||
    !Array.isArray(calculator.rollEntries) ||
    !calculator.rollEntries.every(isSerializableRollEntryV13) ||
    !Array.isArray(calculator.operationSlots) ||
    !calculator.operationSlots.every(isSerializableSlot) ||
    !(calculator.draftingSlot === null || isDraftingSlot(calculator.draftingSlot))
  ) {
    return false;
  }

  const shadowV12: SerializableStateV12 = {
    ...(state as SerializableStateV13),
    calculator: {
      total: calculator.total,
      pendingNegativeTotal: calculator.pendingNegativeTotal,
      singleDigitInitialTotalEntry: calculator.singleDigitInitialTotalEntry,
      roll: [],
      rollErrors: [],
      euclidRemainders: [],
      operationSlots: calculator.operationSlots,
      draftingSlot: calculator.draftingSlot,
    },
  };
  return validateSerializableStateV12(shadowV12);
};

export const migrateToLatest = (schemaVersion: number, state: unknown): SerializableStateV13 | null => {
  if (!isValidSchemaVersion(schemaVersion)) {
    return null;
  }
  if (schemaVersion < 6) {
    return toSerializableInitialV13();
  }
  if (!isObject(state)) {
    return null;
  }

  if (schemaVersion === 6) {
    const asV6 = state as SerializableStateV6;
    const normalizedV6: SerializableStateV6 = {
      ...asV6,
      ui: {
        ...asV6.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV6.ui?.keyLayout)
          ? asV6.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV6.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: withDefaultButtonFlags(normalizeButtonFlags(asV6.ui?.buttonFlags)),
      },
      unlocks: normalizeUnlocks(asV6.unlocks),
      keyPressCounts: isObject(asV6.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV6.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
    };
    if (!validateSerializableStateV6(normalizedV6)) {
      return null;
    }
    return migrateV12ToV13(
      migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(normalizedV6)))))),
    );
  }
  if (schemaVersion === 7) {
    const asV7 = state as SerializableStateV7;
    const normalizedV7: SerializableStateV7 = {
      ...asV7,
      calculator: {
        ...asV7.calculator,
        rollErrors: Array.isArray(asV7.calculator?.rollErrors) ? asV7.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV7.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV7.ui?.keyLayout)
          ? asV7.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV7.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: withDefaultButtonFlags(normalizeButtonFlags(asV7.ui?.buttonFlags)),
      },
      unlocks: normalizeUnlocks(asV7.unlocks),
      keyPressCounts: isObject(asV7.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV7.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
    };
    return validateSerializableStateV7(normalizedV7)
      ? migrateV12ToV13(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(normalizedV7))))))
      : null;
  }
  if (schemaVersion === 8) {
    const asV8 = state as SerializableStateV8;
    const normalizedV8: SerializableStateV8 = {
      ...asV8,
      calculator: {
        ...asV8.calculator,
        rollErrors: Array.isArray(asV8.calculator?.rollErrors) ? asV8.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV8.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV8.ui?.keyLayout)
          ? asV8.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV8.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: withDefaultButtonFlags(normalizeButtonFlags(asV8.ui?.buttonFlags)),
      },
      unlocks: normalizeUnlocks(asV8.unlocks),
      keyPressCounts: isObject(asV8.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV8.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocator: normalizeAllocatorV8(asV8.allocator),
    };
    return validateSerializableStateV8(normalizedV8)
      ? migrateV12ToV13(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(normalizedV8)))))
      : null;
  }
  if (schemaVersion === 9) {
    const asV9 = state as SerializableStateV9;
    const normalizedV9: SerializableStateV9 = {
      ...asV9,
      calculator: {
        ...asV9.calculator,
        rollErrors: Array.isArray(asV9.calculator?.rollErrors) ? asV9.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV9.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV9.ui?.keyLayout)
          ? asV9.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV9.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: withDefaultButtonFlags(normalizeButtonFlags(asV9.ui?.buttonFlags)),
      },
      unlocks: normalizeUnlocks(asV9.unlocks),
      keyPressCounts: isObject(asV9.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV9.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocator: normalizeAllocatorV9(asV9.allocator),
    };
    return validateSerializableStateV9(normalizedV9)
      ? migrateV12ToV13(migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(normalizedV9))))
      : null;
  }
  if (schemaVersion === 10) {
    const asV10 = state as SerializableStateV10;
    const normalizedV10: SerializableStateV10 = {
      ...asV10,
      calculator: {
        ...asV10.calculator,
        rollErrors: Array.isArray(asV10.calculator?.rollErrors) ? asV10.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV10.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV10.ui?.keyLayout)
          ? asV10.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV10.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: withDefaultButtonFlags(normalizeButtonFlags(asV10.ui?.buttonFlags)),
      },
      unlocks: normalizeUnlocks(asV10.unlocks),
      keyPressCounts: isObject(asV10.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV10.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocatorReturnPressCount:
        isInteger(asV10.allocatorReturnPressCount) && asV10.allocatorReturnPressCount >= 0
          ? asV10.allocatorReturnPressCount
          : 0,
      allocatorAllocatePressCount:
        isInteger(asV10.allocatorAllocatePressCount) && asV10.allocatorAllocatePressCount >= 0
          ? asV10.allocatorAllocatePressCount
          : 0,
      allocator: normalizeAllocatorV10(asV10.allocator),
    };
    return validateSerializableStateV10(normalizedV10)
      ? migrateV12ToV13(migrateV11ToV12(migrateV10ToV11(normalizedV10)))
      : null;
  }
  if (schemaVersion === 11) {
    const asV11 = state as SerializableStateV11;
    const buttonFlags = withDefaultButtonFlags(normalizeButtonFlags(asV11.ui?.buttonFlags));
    const normalizedV11: SerializableStateV11 = {
      ...asV11,
      calculator: {
        ...asV11.calculator,
        rollErrors: Array.isArray(asV11.calculator?.rollErrors) ? asV11.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV11.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV11.ui?.keyLayout)
          ? asV11.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV11.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: stripLegacyVisualizerFlags(buttonFlags),
        activeVisualizer: normalizeActiveVisualizer(asV11.ui?.activeVisualizer, buttonFlags),
      },
      unlocks: normalizeUnlocks(asV11.unlocks),
      keyPressCounts: isObject(asV11.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV11.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocatorReturnPressCount:
        isInteger(asV11.allocatorReturnPressCount) && asV11.allocatorReturnPressCount >= 0
          ? asV11.allocatorReturnPressCount
          : 0,
      allocatorAllocatePressCount:
        isInteger(asV11.allocatorAllocatePressCount) && asV11.allocatorAllocatePressCount >= 0
          ? asV11.allocatorAllocatePressCount
          : 0,
      allocator: normalizeAllocatorV10(asV11.allocator),
    };
    return validateSerializableStateV11(normalizedV11) ? migrateV12ToV13(migrateV11ToV12(normalizedV11)) : null;
  }
  if (schemaVersion === 12) {
    const asV12 = state as SerializableStateV12;
    const buttonFlags = withDefaultButtonFlags(normalizeButtonFlags(asV12.ui?.buttonFlags));
    const normalizedV12: SerializableStateV12 = {
      ...asV12,
      calculator: {
        ...asV12.calculator,
        rollErrors: Array.isArray(asV12.calculator?.rollErrors) ? asV12.calculator.rollErrors.filter(isRollErrorEntry) : [],
      },
      ui: {
        ...asV12.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV12.ui?.keyLayout)
          ? asV12.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV12.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: stripLegacyVisualizerFlags(buttonFlags),
        activeVisualizer: normalizeActiveVisualizer(asV12.ui?.activeVisualizer, buttonFlags),
      },
      unlocks: normalizeUnlocks(asV12.unlocks),
      keyPressCounts: isObject(asV12.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV12.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocatorReturnPressCount:
        isInteger(asV12.allocatorReturnPressCount) && asV12.allocatorReturnPressCount >= 0
          ? asV12.allocatorReturnPressCount
          : 0,
      allocatorAllocatePressCount:
        isInteger(asV12.allocatorAllocatePressCount) && asV12.allocatorAllocatePressCount >= 0
          ? asV12.allocatorAllocatePressCount
          : 0,
      allocator: normalizeAllocatorV10(asV12.allocator),
    };
    return validateSerializableStateV12(normalizedV12) ? migrateV12ToV13(normalizedV12) : null;
  }
  if (schemaVersion === 13) {
    const asV13 = state as SerializableStateV13;
    const buttonFlags = withDefaultButtonFlags(normalizeButtonFlags(asV13.ui?.buttonFlags));
    const normalizedV13: SerializableStateV13 = {
      ...asV13,
      calculator: {
        ...asV13.calculator,
        rollEntries: Array.isArray(asV13.calculator?.rollEntries)
          ? asV13.calculator.rollEntries.filter(isSerializableRollEntryV13)
          : [],
      },
      ui: {
        ...asV13.ui,
        keyLayout: hasOnlyKnownLayoutCells(asV13.ui?.keyLayout)
          ? asV13.ui.keyLayout
          : defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
        storageLayout: normalizeStorageSlots(asV13.ui?.storageLayout ?? defaultStorageLayout()),
        buttonFlags: stripLegacyVisualizerFlags(buttonFlags),
        activeVisualizer: normalizeActiveVisualizer(asV13.ui?.activeVisualizer, buttonFlags),
      },
      unlocks: normalizeUnlocks(asV13.unlocks),
      keyPressCounts: isObject(asV13.keyPressCounts)
        ? Object.fromEntries(
            Object.entries(asV13.keyPressCounts).filter(
              ([key, value]) => isKnownKey(key) && isInteger(value) && value >= 0,
            ),
          )
        : {},
      allocatorReturnPressCount:
        isInteger(asV13.allocatorReturnPressCount) && asV13.allocatorReturnPressCount >= 0
          ? asV13.allocatorReturnPressCount
          : 0,
      allocatorAllocatePressCount:
        isInteger(asV13.allocatorAllocatePressCount) && asV13.allocatorAllocatePressCount >= 0
          ? asV13.allocatorAllocatePressCount
          : 0,
      allocator: normalizeAllocatorV10(asV13.allocator),
    };
    return validateSerializableStateV13(normalizedV13) ? normalizedV13 : null;
  }
  return null;
};

