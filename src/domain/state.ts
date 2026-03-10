import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { buttonRegistry, type ButtonUnlockGroup } from "./buttonRegistry.js";
import type { GameState, Key, KeyCell, LayoutCell } from "./types.js";
import { buildAllocatorSnapshot, createDefaultLambdaControl } from "./lambdaControl.js";

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 16;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";
export const OVERFLOW_ERROR_SEEN_ID = "overflow_error_seen";
export const LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID = "lambda_spent_points_dropped_to_zero_seen";
export const AUTO_EQUALS_FLAG = "execution.pause";
export const KEYPAD_DEFAULT_COLUMNS = 1;
export const KEYPAD_DEFAULT_ROWS = 1;
export const KEYPAD_DIM_MIN = 1;
export const KEYPAD_DIM_MAX = 8;
export const TOTAL_DIGITS_MIN = 1;
export const TOTAL_DIGITS_MAX = 12;
export const OPERATION_SLOTS_MIN = 0;
export const OPERATION_SLOTS_MAX = 4;
export const STORAGE_COLUMNS = 8;
export const STORAGE_INITIAL_ROWS = 1;
export const STORAGE_INITIAL_SLOTS = STORAGE_COLUMNS * STORAGE_INITIAL_ROWS;
const DEFAULT_KEYPAD_KEYS: readonly Key[] = ["="];

type UnlockGroup = Exclude<ButtonUnlockGroup, "none">;
type UnlockGroupRecord<B extends UnlockGroup> =
  B extends "valueAtoms" ? GameState["unlocks"]["valueAtoms"]
    : B extends "valueCompose" ? GameState["unlocks"]["valueCompose"]
    : B extends "slotOperators" ? GameState["unlocks"]["slotOperators"]
      : B extends "unaryOperators" ? GameState["unlocks"]["unaryOperators"]
      : B extends "utilities" ? GameState["unlocks"]["utilities"]
        : B extends "memory" ? GameState["unlocks"]["memory"]
          : B extends "steps" ? GameState["unlocks"]["steps"]
            : B extends "visualizers" ? GameState["unlocks"]["visualizers"]
              : GameState["unlocks"]["execution"];

const buildUnlockRecord = <B extends UnlockGroup>(group: B): UnlockGroupRecord<B> => {
  const record: Record<string, boolean> = {};
  for (const entry of buttonRegistry) {
    if (entry.unlockGroup !== group) {
      continue;
    }
    record[entry.key] = entry.defaultUnlocked;
  }
  return record as UnlockGroupRecord<B>;
};

const combineValueExpressionUnlocks = (
  valueAtoms: GameState["unlocks"]["valueAtoms"],
  valueCompose: GameState["unlocks"]["valueCompose"],
): GameState["unlocks"]["valueExpression"] => ({
  ...valueAtoms,
  ...valueCompose,
});

export const defaultStorageKeys = (): KeyCell[] =>
  defaultKeyLayout()
    .filter((cell): cell is KeyCell => cell.kind === "key" && !DEFAULT_KEYPAD_KEYS.includes(cell.key))
    .map((cell) => ({ ...cell }));

export const defaultStorageLayout = (): Array<KeyCell | null> => {
  const keys = defaultStorageKeys();
  const slots: Array<KeyCell | null> = [...keys];
  const minSlots = Math.max(
    STORAGE_INITIAL_SLOTS,
    Math.ceil(slots.length / STORAGE_COLUMNS) * STORAGE_COLUMNS,
  );
  while (slots.length < minSlots) {
    slots.push(null);
  }
  if (!slots.some((slot) => slot === null)) {
    for (let index = 0; index < STORAGE_COLUMNS; index += 1) {
      slots.push(null);
    }
  }
  return slots;
};

export const defaultDrawerKeyLayout = (
  columns: number = KEYPAD_DEFAULT_COLUMNS,
  rows: number = KEYPAD_DEFAULT_ROWS,
): LayoutCell[] => {
  const slotCount = Math.max(1, columns * rows);
  const layout: LayoutCell[] = Array.from({ length: slotCount }, () => ({ kind: "placeholder", area: "empty" as const }));
  const visibleKeyCount = Math.min(slotCount, DEFAULT_KEYPAD_KEYS.length);
  const startIndex = slotCount - visibleKeyCount;
  for (let index = 0; index < visibleKeyCount; index += 1) {
    layout[startIndex + index] = { kind: "key", key: DEFAULT_KEYPAD_KEYS[index] };
  }
  return layout;
};

export const defaultKeyLayout = (): LayoutCell[] => [
  { kind: "placeholder", area: "graph" },
  { kind: "placeholder", area: "empty" },
  { kind: "key", key: "CE" },
  { kind: "key", key: "\u2190" },
  { kind: "key", key: "UNDO" },
  { kind: "key", key: "C" },
  { kind: "key", key: "M+" },
  { kind: "key", key: "M\u2013" },
  { kind: "key", key: "M\u2192" },
  { kind: "key", key: "\u03B1,\u03B2,\u03B3" },
  { kind: "key", key: "FEED" },
  { kind: "key", key: "𝚷𝑝^𝑒" },
  { kind: "key", key: "CIRCLE" },
  { kind: "key", key: "GRAPH" },
  { kind: "key", key: "ALG" },
  { kind: "key", key: "\u03BB" },
  { kind: "key", key: "/" },
  { kind: "key", key: "\u27E1" },
  { kind: "key", key: "#" },
  { kind: "key", key: "*" },
  { kind: "key", key: "7" },
  { kind: "key", key: "8" },
  { kind: "key", key: "9" },
  { kind: "key", key: "pi" },
  { kind: "key", key: "-" },
  { kind: "key", key: "4" },
  { kind: "key", key: "5" },
  { kind: "key", key: "6" },
  { kind: "key", key: "e" },
  { kind: "key", key: "+" },
  { kind: "key", key: "++" },
  { kind: "key", key: "--" },
  { kind: "key", key: "-n" },
  { kind: "key", key: "1" },
  { kind: "key", key: "2" },
  { kind: "key", key: "3" },
  { kind: "key", key: "0" },
  { kind: "key", key: "=" },
  { kind: "key", key: "\u23EF", behavior: { type: "toggle_flag", flag: AUTO_EQUALS_FLAG } },
];

export const initialState = (): GameState => {
  const keyLayout = defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS);
  const valueAtoms = buildUnlockRecord("valueAtoms");
  const valueCompose = buildUnlockRecord("valueCompose");
  const lambdaControl = createDefaultLambdaControl();
  return {
    calculator: {
      total: { kind: "rational", value: { num: 0n, den: 1n } },
      seedSnapshot: undefined,
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: false,
      rollEntries: [],
      operationSlots: [],
      draftingSlot: null,
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl),
    ui: {
      keyLayout,
      keypadCells: fromKeyLayoutArray(keyLayout, KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
      storageLayout: defaultStorageLayout(),
      keypadColumns: KEYPAD_DEFAULT_COLUMNS,
      keypadRows: KEYPAD_DEFAULT_ROWS,
      activeVisualizer: "total",
      memoryVariable: "α",
      buttonFlags: {},
    },
    keyPressCounts: {},
    allocatorReturnPressCount: 0,
    allocatorAllocatePressCount: 0,
    unlocks: {
      valueAtoms,
      valueCompose,
      valueExpression: combineValueExpressionUnlocks(valueAtoms, valueCompose),
      slotOperators: buildUnlockRecord("slotOperators"),
      unaryOperators: buildUnlockRecord("unaryOperators"),
      utilities: buildUnlockRecord("utilities"),
      memory: buildUnlockRecord("memory"),
      steps: buildUnlockRecord("steps"),
      visualizers: buildUnlockRecord("visualizers"),
      execution: buildUnlockRecord("execution"),
      uiUnlocks: {
        storageVisible: true,
      },
      maxSlots: 0,
      maxTotalDigits: 1,
    },
    completedUnlockIds: [],
  };
};

