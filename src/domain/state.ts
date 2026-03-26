import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { buttonRegistry, type ButtonUnlockGroup } from "./buttonRegistry.js";
import type { GameState, Key, KeyCell, LayoutCell } from "./types.js";
import { buildAllocatorSnapshot, createDefaultLambdaControl, getLambdaDerivedValues } from "./lambdaControl.js";
import { KEY_ID } from "./keyPresentation.js";
import { controlProfiles } from "./controlProfilesCatalog.js";
import { applyCalculatorSeedPlacements } from "./calculatorSeedManifest.js";

export const createInitialUiDiagnosticsLastAction = (): GameState["ui"]["diagnostics"]["lastAction"] => ({
  sequence: 0,
  actionKind: "none",
});

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 20;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";
export const OVERFLOW_ERROR_SEEN_ID = "overflow_error_seen";
export const LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID = "lambda_spent_points_dropped_to_zero_seen";
export const LAMBDA_POINTS_AWARDED_SEEN_ID = "lambda_points_awarded_seen";
export const LAMBDA_POINTS_SPENT_SEEN_ID = "lambda_points_spent_seen";
export const LAMBDA_POINTS_REFUNDED_SEEN_ID = "lambda_points_refunded_seen";
export const NAN_RESULT_SEEN_ID = "nan_result_seen";
export const C_CLEARED_FUNCTION_TWO_SLOTS_SEEN_ID = "c_cleared_function_two_slots_seen";
export const UNDO_WHILE_FEED_VISIBLE_SEEN_ID = "undo_while_feed_visible_seen";
export const OVERFLOW_ERROR_IN_BINARY_MODE_SEEN_ID = "overflow_error_in_binary_mode_seen";
export const BINARY_ADD_RESULT_ONE_SEEN_ID = "binary_add_result_one_seen";
export const BINARY_MUL_RESULT_ZERO_SEEN_ID = "binary_mul_result_zero_seen";
export const EXECUTION_PAUSE_FLAG = "execution.pause";
export const EXECUTION_PAUSE_EQUALS_FLAG = "execution.pause.equals";
// Backward-compatible alias retained while downstream modules migrate naming.
export const AUTO_EQUALS_FLAG = EXECUTION_PAUSE_FLAG;
export const DELTA_RANGE_CLAMP_FLAG = "settings.delta_range_clamp";
export const MOD_ZERO_TO_DELTA_FLAG = "settings.mod_zero_to_delta";
export const STEP_EXPANSION_FLAG = "settings.step_expansion";
export const BINARY_MODE_FLAG = "settings.binary_mode";
export const KEYPAD_DIM_MIN = 1;
export const KEYPAD_DIM_MAX = 8;
export const KEYPAD_DEFAULT_COLUMNS = Math.max(
  KEYPAD_DIM_MIN,
  Math.min(KEYPAD_DIM_MAX, Math.trunc(controlProfiles.f.starts.alpha)),
);
export const KEYPAD_DEFAULT_ROWS = Math.max(
  KEYPAD_DIM_MIN,
  Math.min(KEYPAD_DIM_MAX, Math.trunc(controlProfiles.f.starts.beta)),
);
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
  { kind: "key", key: KEY_ID.util_backspace },
  { kind: "key", key: KEY_ID.util_undo },
  { kind: "key", key: KEY_ID.util_clear_all },
  { kind: "key", key: KEY_ID.memory_adjust_plus },
  { kind: "key", key: KEY_ID.memory_adjust_minus },
  { kind: "key", key: KEY_ID.memory_recall },
  { kind: "key", key: KEY_ID.memory_cycle_variable },
  { kind: "key", key: KEY_ID.system_save_quit_main_menu },
  { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
  { kind: "key", key: KEY_ID.toggle_mod_zero_to_delta, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } },
  { kind: "key", key: KEY_ID.toggle_step_expansion, behavior: { type: "toggle_flag", flag: STEP_EXPANSION_FLAG } },
  { kind: "key", key: KEY_ID.toggle_binary_mode, behavior: { type: "toggle_flag", flag: BINARY_MODE_FLAG } },
  { kind: "key", key: KEY_ID.system_quit_game },
  { kind: "key", key: KEY_ID.system_mode_game },
  { kind: "key", key: KEY_ID.system_new_game },
  { kind: "key", key: KEY_ID.system_mode_sandbox },
  { kind: "key", key: KEY_ID.viz_feed },
  { kind: "key", key: KEY_ID.viz_title },
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
  { kind: "key", key: KEY_ID.op_max },
  { kind: "key", key: KEY_ID.op_min },
  { kind: "key", key: KEY_ID.op_euclid_div },
  { kind: "key", key: KEY_ID.op_mul },
  { kind: "key", key: KEY_ID.op_pow },
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
  { kind: "key", key: KEY_ID.unary_not },
  { kind: "key", key: KEY_ID.unary_collatz },
  { kind: "key", key: KEY_ID.unary_sort_asc },
  { kind: "key", key: KEY_ID.unary_floor },
  { kind: "key", key: KEY_ID.unary_ceil },
  { kind: "key", key: KEY_ID.unary_mirror_digits },
  { kind: "key", key: KEY_ID.digit_1 },
  { kind: "key", key: KEY_ID.digit_2 },
  { kind: "key", key: KEY_ID.digit_3 },
  { kind: "key", key: KEY_ID.digit_0 },
  { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
  { kind: "key", key: KEY_ID.exec_step_through },
  { kind: "key", key: KEY_ID.exec_roll_inverse },
];

export const initialState = (): GameState => {
  const valueAtoms = buildUnlockRecord("valueAtoms");
  const valueCompose = buildUnlockRecord("valueCompose");
  const fProfile = controlProfiles.f;
  const lambdaControl = createDefaultLambdaControl(fProfile);
  const lambdaDerived = getLambdaDerivedValues(lambdaControl, fProfile);
  const initialColumns = lambdaDerived.effectiveFields.alpha;
  const initialRows = lambdaDerived.effectiveFields.beta;
  const keyLayout = applyCalculatorSeedPlacements(
    "f",
    defaultDrawerKeyLayout(initialColumns, initialRows),
    initialColumns,
    initialRows,
  );
  const base: GameState = {
    calculator: {
      total: { kind: "rational", value: { num: 0n, den: 1n } },
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: false,
      rollEntries: [],
      rollAnalysis: {
        stopReason: "none",
        cycle: null,
      },
      operationSlots: [],
      draftingSlot: null,
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl, fProfile),
    ui: {
      keyLayout,
      keypadCells: fromKeyLayoutArray(keyLayout, initialColumns, initialRows),
      storageLayout: defaultStorageLayout(),
      keypadColumns: initialColumns,
      keypadRows: initialRows,
      activeVisualizer: "total",
      memoryVariable: "α",
      buttonFlags: {},
      diagnostics: {
        lastAction: createInitialUiDiagnosticsLastAction(),
      },
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
      maxSlots: lambdaDerived.effectiveFields.gamma,
      maxTotalDigits: lambdaDerived.effectiveFields.delta,
    },
    completedUnlockIds: [],
  };
  return {
    ...base,
    calculators: {
      f: {
        id: "f",
        symbol: "f",
        calculator: { ...base.calculator },
        lambdaControl: base.lambdaControl,
        allocator: base.allocator,
        ui: base.ui,
      },
    },
    calculatorOrder: ["f"],
    activeCalculatorId: "f",
    perCalculatorCompletedUnlockIds: { f: [] },
    sessionControlProfiles: {},
  };
};

