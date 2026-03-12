import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { buttonRegistry, type ButtonUnlockGroup } from "./buttonRegistry.js";
import type { GameState, Key, KeyCell, LayoutCell } from "./types.js";
import { buildAllocatorSnapshot, createDefaultLambdaControl } from "./lambdaControl.js";
import { KEY_ID, toKeyId } from "./keyPresentation.js";

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 17;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";
export const OVERFLOW_ERROR_SEEN_ID = "overflow_error_seen";
export const LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID = "lambda_spent_points_dropped_to_zero_seen";
export const AUTO_EQUALS_FLAG = "execution.pause";
export const DELTA_RANGE_CLAMP_FLAG = "settings.delta_range_clamp";
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
const DEFAULT_KEYPAD_KEYS: readonly Key[] = [KEY_ID.exec_equals];
const isDefaultDrawerExecutionCell = (cell: LayoutCell): cell is KeyCell =>
  cell.kind === "key" && DEFAULT_KEYPAD_KEYS.includes(cell.key) && !cell.behavior;

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
    record[toKeyId(entry.key)] = entry.defaultUnlocked;
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
    .filter((cell): cell is KeyCell => cell.kind === "key" && !isDefaultDrawerExecutionCell(cell))
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
  { kind: "key", key: KEY_ID.util_clear_entry },
  { kind: "key", key: KEY_ID.util_backspace },
  { kind: "key", key: KEY_ID.util_undo },
  { kind: "key", key: KEY_ID.util_clear_all },
  { kind: "key", key: KEY_ID.memory_adjust_plus },
  { kind: "key", key: KEY_ID.memory_adjust_minus },
  { kind: "key", key: KEY_ID.memory_recall },
  { kind: "key", key: KEY_ID.memory_cycle_variable },
  { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
  { kind: "key", key: KEY_ID.viz_feed },
  { kind: "key", key: KEY_ID.viz_factorization },
  { kind: "key", key: KEY_ID.viz_circle },
  { kind: "key", key: KEY_ID.viz_graph },
  { kind: "key", key: KEY_ID.viz_algebraic },
  { kind: "key", key: KEY_ID.viz_eigen_allocator },
  { kind: "key", key: KEY_ID.op_div },
  { kind: "key", key: KEY_ID.op_mod },
  { kind: "key", key: KEY_ID.op_rotate_left },
  { kind: "key", key: KEY_ID.op_gcd },
  { kind: "key", key: KEY_ID.op_lcm },
  { kind: "key", key: KEY_ID.op_euclid_div },
  { kind: "key", key: KEY_ID.op_mul },
  { kind: "key", key: KEY_ID.digit_7 },
  { kind: "key", key: KEY_ID.digit_8 },
  { kind: "key", key: KEY_ID.digit_9 },
  { kind: "key", key: KEY_ID.const_pi },
  { kind: "key", key: KEY_ID.op_sub },
  { kind: "key", key: KEY_ID.digit_4 },
  { kind: "key", key: KEY_ID.digit_5 },
  { kind: "key", key: KEY_ID.digit_6 },
  { kind: "key", key: KEY_ID.const_e },
  { kind: "key", key: KEY_ID.op_add },
  { kind: "key", key: KEY_ID.unary_inc },
  { kind: "key", key: KEY_ID.unary_dec },
  { kind: "key", key: KEY_ID.unary_neg },
  { kind: "key", key: KEY_ID.unary_sigma },
  { kind: "key", key: KEY_ID.unary_phi },
  { kind: "key", key: KEY_ID.unary_omega },
  { kind: "key", key: KEY_ID.digit_1 },
  { kind: "key", key: KEY_ID.digit_2 },
  { kind: "key", key: KEY_ID.digit_3 },
  { kind: "key", key: KEY_ID.digit_0 },
  { kind: "key", key: KEY_ID.exec_equals },
  { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: AUTO_EQUALS_FLAG } },
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
