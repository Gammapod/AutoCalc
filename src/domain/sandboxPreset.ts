import { buildAllocatorSnapshot, getLambdaDerivedValues } from "./lambdaControl.js";
import { fromKeyLayoutArray, toIndexFromCoord } from "./keypadLayoutModel.js";
import { applyUnlockAllPreset } from "./lifecyclePresets.js";
import { KEY_ID } from "./keyPresentation.js";
import {
  BINARY_MODE_FLAG,
  defaultStorageLayout,
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_EQUALS_FLAG,
  EXECUTION_PAUSE_FLAG,
  initialState,
  MOD_ZERO_TO_DELTA_FLAG,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "./state.js";
import type { GameState, KeyCell, LayoutCell } from "./types.js";
import { controlProfiles } from "./controlProfilesCatalog.js";

const SANDBOX_KEYPAD_COLUMNS = 7;
const SANDBOX_KEYPAD_ROWS = 7;

const SANDBOX_LAYOUT_ENTRIES: ReadonlyArray<{
  row: number;
  col: number;
  cell: KeyCell;
}> = [
  {
    row: 7,
    col: 7,
    cell: { kind: "key", key: KEY_ID.system_save_quit_main_menu },
  },
  { row: 7, col: 6, cell: { kind: "key", key: KEY_ID.viz_graph } },
  { row: 7, col: 5, cell: { kind: "key", key: KEY_ID.viz_circle } },
  { row: 7, col: 4, cell: { kind: "key", key: KEY_ID.viz_feed } },
  { row: 7, col: 3, cell: { kind: "key", key: KEY_ID.viz_help } },
  { row: 7, col: 2, cell: { kind: "key", key: KEY_ID.toggle_step_expansion } },
  { row: 7, col: 1, cell: { kind: "key", key: KEY_ID.util_clear_all } },

  {
    row: 6,
    col: 7,
    cell: { kind: "key", key: KEY_ID.toggle_mod_zero_to_delta, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } },
  },
  {
    row: 6,
    col: 6,
    cell: { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
  },
  { row: 6, col: 5, cell: { kind: "key", key: KEY_ID.op_rotate_left } },
  { row: 6, col: 4, cell: { kind: "key", key: KEY_ID.unary_ceil } },
  { row: 6, col: 3, cell: { kind: "key", key: KEY_ID.op_min } },
  { row: 6, col: 2, cell: { kind: "key", key: KEY_ID.op_gcd } },
  { row: 6, col: 1, cell: { kind: "key", key: KEY_ID.util_backspace } },

  {
    row: 5,
    col: 7,
    cell: { kind: "key", key: KEY_ID.toggle_binary_mode, behavior: { type: "toggle_flag", flag: BINARY_MODE_FLAG } },
  },
  { row: 5, col: 6, cell: { kind: "key", key: KEY_ID.unary_sort_asc } },
  { row: 5, col: 5, cell: { kind: "key", key: KEY_ID.unary_mirror_digits } },
  { row: 5, col: 4, cell: { kind: "key", key: KEY_ID.unary_floor } },
  { row: 5, col: 3, cell: { kind: "key", key: KEY_ID.op_max } },
  { row: 5, col: 2, cell: { kind: "key", key: KEY_ID.op_lcm } },
  { row: 5, col: 1, cell: { kind: "key", key: KEY_ID.util_undo } },

  { row: 4, col: 7, cell: { kind: "key", key: KEY_ID.unary_sigma } },
  { row: 4, col: 6, cell: { kind: "key", key: KEY_ID.unary_omega } },
  { row: 4, col: 5, cell: { kind: "key", key: KEY_ID.unary_phi } },
  { row: 4, col: 4, cell: { kind: "key", key: KEY_ID.unary_collatz } },
  { row: 4, col: 3, cell: { kind: "key", key: KEY_ID.op_pow } },
  { row: 4, col: 2, cell: { kind: "key", key: KEY_ID.op_div } },
  { row: 4, col: 1, cell: { kind: "key", key: KEY_ID.op_mod } },

  { row: 3, col: 7, cell: { kind: "key", key: KEY_ID.digit_7 } },
  { row: 3, col: 6, cell: { kind: "key", key: KEY_ID.digit_8 } },
  { row: 3, col: 5, cell: { kind: "key", key: KEY_ID.digit_9 } },
  { row: 3, col: 4, cell: { kind: "key", key: KEY_ID.unary_not } },
  { row: 3, col: 3, cell: { kind: "key", key: KEY_ID.op_mul } },
  { row: 3, col: 2, cell: { kind: "key", key: KEY_ID.op_euclid_div } },
  { row: 3, col: 1, cell: { kind: "key", key: KEY_ID.exec_roll_inverse } },

  { row: 2, col: 7, cell: { kind: "key", key: KEY_ID.digit_4 } },
  { row: 2, col: 6, cell: { kind: "key", key: KEY_ID.digit_5 } },
  { row: 2, col: 5, cell: { kind: "key", key: KEY_ID.digit_6 } },
  { row: 2, col: 4, cell: { kind: "key", key: KEY_ID.unary_neg } },
  { row: 2, col: 3, cell: { kind: "key", key: KEY_ID.op_add } },
  { row: 2, col: 2, cell: { kind: "key", key: KEY_ID.unary_inc } },
  { row: 2, col: 1, cell: { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } } },

  { row: 1, col: 7, cell: { kind: "key", key: KEY_ID.digit_1 } },
  { row: 1, col: 6, cell: { kind: "key", key: KEY_ID.digit_2 } },
  { row: 1, col: 5, cell: { kind: "key", key: KEY_ID.digit_3 } },
  { row: 1, col: 4, cell: { kind: "key", key: KEY_ID.digit_0 } },
  { row: 1, col: 3, cell: { kind: "key", key: KEY_ID.op_sub } },
  { row: 1, col: 2, cell: { kind: "key", key: KEY_ID.unary_dec } },
  { row: 1, col: 1, cell: { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } } },
];

const keyCellSignature = (cell: KeyCell): string =>
  `${cell.key}|${cell.behavior?.type ?? "none"}|${cell.behavior?.type === "toggle_flag" ? cell.behavior.flag : ""}`;

const withPaddedStorageSlots = (keyCells: KeyCell[]): Array<KeyCell | null> => {
  const slots: Array<KeyCell | null> = [...keyCells];
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

const createSandboxKeyLayout = (): LayoutCell[] => {
  const slotCount = SANDBOX_KEYPAD_COLUMNS * SANDBOX_KEYPAD_ROWS;
  const keyLayout: LayoutCell[] = Array.from({ length: slotCount }, () => ({ kind: "placeholder", area: "empty" as const }));
  const occupiedCoords = new Set<string>();
  const occupiedKeys = new Set<string>();

  for (const entry of SANDBOX_LAYOUT_ENTRIES) {
    const coordKey = `${entry.row}:${entry.col}`;
    if (occupiedCoords.has(coordKey)) {
      throw new Error(`Sandbox layout has duplicate coordinate ${coordKey}.`);
    }
    occupiedCoords.add(coordKey);
    if (entry.row < 1 || entry.row > SANDBOX_KEYPAD_ROWS || entry.col < 1 || entry.col > SANDBOX_KEYPAD_COLUMNS) {
      throw new Error(`Sandbox layout coordinate out of bounds: ${coordKey}.`);
    }
    const keySignature = keyCellSignature(entry.cell);
    if (occupiedKeys.has(keySignature)) {
      throw new Error(`Sandbox layout has duplicate key cell ${keySignature}.`);
    }
    occupiedKeys.add(keySignature);
    const index = toIndexFromCoord(
      { row: entry.row, col: entry.col },
      SANDBOX_KEYPAD_COLUMNS,
      SANDBOX_KEYPAD_ROWS,
    );
    keyLayout[index] = entry.cell.behavior
      ? { kind: "key", key: entry.cell.key, behavior: entry.cell.behavior }
      : { kind: "key", key: entry.cell.key };
  }

  return keyLayout;
};

const createSandboxStorageLayout = (keyLayout: LayoutCell[]): Array<KeyCell | null> => {
  const keypadKeys = new Set(
    keyLayout
      .filter((cell): cell is KeyCell => cell.kind === "key")
      .map((cell) => keyCellSignature(cell)),
  );

  const remainingKeys = defaultStorageLayout()
    .filter((cell): cell is KeyCell => cell !== null)
    .filter((cell) => !keypadKeys.has(keyCellSignature(cell)));

  return withPaddedStorageSlots(remainingKeys);
};

export const createSandboxState = (): GameState => {
  const unlocked = applyUnlockAllPreset(initialState());
  const keyLayout = createSandboxKeyLayout();
  const storageLayout = createSandboxStorageLayout(keyLayout);
  const lambdaControl: GameState["lambdaControl"] = {
    maxPoints: 10,
    alpha: 7,
    beta: 7,
    gamma: 4,
    gammaMinRaised: true,
  };
  const lambdaDerived = getLambdaDerivedValues(lambdaControl, controlProfiles.f);
  const sandboxCalculator = unlocked.calculators?.f;
  if (!sandboxCalculator) {
    throw new Error("Sandbox preset failed to materialize base calculator f.");
  }

  const sandboxUi: GameState["ui"] = {
    ...unlocked.ui,
    keyLayout,
    keypadColumns: SANDBOX_KEYPAD_COLUMNS,
    keypadRows: SANDBOX_KEYPAD_ROWS,
    keypadCells: fromKeyLayoutArray(keyLayout, SANDBOX_KEYPAD_COLUMNS, SANDBOX_KEYPAD_ROWS),
    storageLayout,
    activeVisualizer: "total",
    buttonFlags: {},
  };

  return {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      singleDigitInitialTotalEntry: true,
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl, controlProfiles.f),
    ui: sandboxUi,
    calculators: {
      f: {
        ...sandboxCalculator,
        calculator: {
          ...unlocked.calculator,
          singleDigitInitialTotalEntry: true,
        },
        lambdaControl,
        allocator: buildAllocatorSnapshot(lambdaControl, controlProfiles.f),
        ui: sandboxUi,
      },
    },
    calculatorOrder: ["f"],
    activeCalculatorId: "f",
    perCalculatorCompletedUnlockIds: {
      f: [...(unlocked.perCalculatorCompletedUnlockIds?.f ?? [])],
    },
    unlocks: {
      ...unlocked.unlocks,
      uiUnlocks: {
        ...unlocked.unlocks.uiUnlocks,
        storageVisible: false,
      },
      maxSlots: lambdaDerived.effectiveFields.gamma,
      maxTotalDigits: lambdaDerived.effectiveFields.delta,
    },
  };
};
