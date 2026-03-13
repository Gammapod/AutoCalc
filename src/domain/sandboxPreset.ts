import { buildAllocatorSnapshot } from "./lambdaControl.js";
import { fromKeyLayoutArray, toIndexFromCoord } from "./keypadLayoutModel.js";
import { applyUnlockAllPreset } from "./lifecyclePresets.js";
import { KEY_ID } from "./keyPresentation.js";
import {
  defaultStorageLayout,
  DELTA_RANGE_CLAMP_FLAG,
  initialState,
  MOD_ZERO_TO_DELTA_FLAG,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "./state.js";
import type { GameState, KeyCell, LayoutCell } from "./types.js";

const SANDBOX_KEYPAD_COLUMNS = 5;
const SANDBOX_KEYPAD_ROWS = 8;

const SANDBOX_LAYOUT_ENTRIES: ReadonlyArray<{
  row: number;
  col: number;
  cell: KeyCell;
}> = [
  {
    row: 8,
    col: 5,
    cell: { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
  },
  { row: 8, col: 4, cell: { kind: "key", key: KEY_ID.viz_feed } },
  { row: 8, col: 3, cell: { kind: "key", key: KEY_ID.viz_graph } },
  { row: 8, col: 2, cell: { kind: "key", key: KEY_ID.viz_circle } },
  { row: 8, col: 1, cell: { kind: "key", key: KEY_ID.viz_factorization } },

  {
    row: 7,
    col: 5,
    cell: { kind: "key", key: KEY_ID.toggle_mod_zero_to_delta, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } },
  },
  { row: 7, col: 1, cell: { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: "execution.pause" } } },

  { row: 6, col: 5, cell: { kind: "key", key: KEY_ID.op_gcd } },
  { row: 6, col: 4, cell: { kind: "key", key: KEY_ID.util_undo } },
  { row: 6, col: 3, cell: { kind: "key", key: KEY_ID.util_backspace } },
  { row: 6, col: 2, cell: { kind: "key", key: KEY_ID.util_clear_entry } },
  { row: 6, col: 1, cell: { kind: "key", key: KEY_ID.util_clear_all } },

  { row: 5, col: 5, cell: { kind: "key", key: KEY_ID.op_lcm } },
  { row: 5, col: 4, cell: { kind: "key", key: KEY_ID.op_rotate_left } },
  { row: 5, col: 3, cell: { kind: "key", key: KEY_ID.op_mod } },
  { row: 5, col: 2, cell: { kind: "key", key: KEY_ID.op_euclid_div } },
  { row: 5, col: 1, cell: { kind: "key", key: KEY_ID.op_div } },

  { row: 4, col: 5, cell: { kind: "key", key: KEY_ID.unary_phi } },
  { row: 4, col: 4, cell: { kind: "key", key: KEY_ID.unary_sigma } },
  { row: 4, col: 3, cell: { kind: "key", key: KEY_ID.unary_omega } },
  { row: 4, col: 2, cell: { kind: "key", key: KEY_ID.unary_neg } },
  { row: 4, col: 1, cell: { kind: "key", key: KEY_ID.op_mul } },

  { row: 3, col: 5, cell: { kind: "key", key: KEY_ID.digit_7 } },
  { row: 3, col: 4, cell: { kind: "key", key: KEY_ID.digit_8 } },
  { row: 3, col: 3, cell: { kind: "key", key: KEY_ID.digit_9 } },
  { row: 3, col: 2, cell: { kind: "key", key: KEY_ID.unary_dec } },
  { row: 3, col: 1, cell: { kind: "key", key: KEY_ID.op_sub } },

  { row: 2, col: 5, cell: { kind: "key", key: KEY_ID.digit_4 } },
  { row: 2, col: 4, cell: { kind: "key", key: KEY_ID.digit_5 } },
  { row: 2, col: 3, cell: { kind: "key", key: KEY_ID.digit_6 } },
  { row: 2, col: 2, cell: { kind: "key", key: KEY_ID.unary_inc } },
  { row: 2, col: 1, cell: { kind: "key", key: KEY_ID.op_add } },

  { row: 1, col: 5, cell: { kind: "key", key: KEY_ID.digit_1 } },
  { row: 1, col: 4, cell: { kind: "key", key: KEY_ID.digit_2 } },
  { row: 1, col: 3, cell: { kind: "key", key: KEY_ID.digit_3 } },
  { row: 1, col: 2, cell: { kind: "key", key: KEY_ID.digit_0 } },
  { row: 1, col: 1, cell: { kind: "key", key: KEY_ID.exec_equals } },
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
    alpha: 4,
    beta: 7,
    gamma: 4,
    overrides: {
      delta: 12,
      epsilon: { num: 5n, den: 1n },
    },
  };

  return {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      singleDigitInitialTotalEntry: true,
    },
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl),
    ui: {
      ...unlocked.ui,
      keyLayout,
      keypadColumns: SANDBOX_KEYPAD_COLUMNS,
      keypadRows: SANDBOX_KEYPAD_ROWS,
      keypadCells: fromKeyLayoutArray(keyLayout, SANDBOX_KEYPAD_COLUMNS, SANDBOX_KEYPAD_ROWS),
      storageLayout,
      activeVisualizer: "total",
      buttonFlags: {},
    },
    unlocks: {
      ...unlocked.unlocks,
      uiUnlocks: {
        ...unlocked.unlocks.uiUnlocks,
        storageVisible: false,
      },
      maxSlots: 4,
      maxTotalDigits: 12,
    },
  };
};
