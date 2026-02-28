import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import type { GameState, Key, KeyCell, LayoutCell } from "./types.js";

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 5;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";
export const AUTO_EQUALS_FLAG = "execution.pause";
export const GRAPH_VISIBLE_FLAG = "graph.visible";
export const KEYPAD_DEFAULT_COLUMNS = 3;
export const KEYPAD_DEFAULT_ROWS = 1;
export const KEYPAD_DIM_MIN = 1;
export const KEYPAD_DIM_MAX = 8;
export const STORAGE_COLUMNS = 8;
export const STORAGE_INITIAL_ROWS = 1;
export const STORAGE_INITIAL_SLOTS = STORAGE_COLUMNS * STORAGE_INITIAL_ROWS;
const DEFAULT_KEYPAD_KEYS: readonly Key[] = ["1", "+", "="];

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
  for (let index = 0; index < Math.min(slotCount, DEFAULT_KEYPAD_KEYS.length); index += 1) {
    layout[index] = { kind: "key", key: DEFAULT_KEYPAD_KEYS[index] };
  }
  return layout;
};

export const defaultKeyLayout = (): LayoutCell[] => [
  { kind: "placeholder", area: "graph" },
  { kind: "placeholder", area: "empty" },
  { kind: "key", key: "CE" },
  { kind: "key", key: "C" },
  { kind: "key", key: "GRAPH", behavior: { type: "toggle_flag", flag: GRAPH_VISIBLE_FLAG } },
  { kind: "key", key: "/" },
  { kind: "key", key: "\u27E1" },
  { kind: "key", key: "#" },
  { kind: "key", key: "*" },
  { kind: "key", key: "7" },
  { kind: "key", key: "8" },
  { kind: "key", key: "9" },
  { kind: "key", key: "-" },
  { kind: "key", key: "4" },
  { kind: "key", key: "5" },
  { kind: "key", key: "6" },
  { kind: "key", key: "+" },
  { kind: "key", key: "1" },
  { kind: "key", key: "2" },
  { kind: "key", key: "3" },
  { kind: "key", key: "=" },
  { kind: "key", key: "0" },
  { kind: "key", key: "++" },
  { kind: "key", key: "NEG" },
  { kind: "key", key: "\u23EF", behavior: { type: "toggle_flag", flag: AUTO_EQUALS_FLAG } },
];

export const initialState = (): GameState => {
  const keyLayout = defaultDrawerKeyLayout(KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS);
  return {
    calculator: {
      total: { num: 0n, den: 1n },
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: false,
      roll: [],
      euclidRemainders: [],
      operationSlots: [],
      draftingSlot: null,
    },
    ui: {
      keyLayout,
      keypadCells: fromKeyLayoutArray(keyLayout, KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS),
      storageLayout: defaultStorageLayout(),
      keypadColumns: KEYPAD_DEFAULT_COLUMNS,
      keypadRows: KEYPAD_DEFAULT_ROWS,
      buttonFlags: {
        [GRAPH_VISIBLE_FLAG]: false,
      },
    },
    unlocks: {
      valueExpression: {
        "0": false,
        "1": true,
        "2": false,
        "3": false,
        "4": false,
        "5": false,
        "6": false,
        "7": false,
        "8": false,
        "9": false,
        NEG: false,
      },
      slotOperators: {
        "+": false,
        "-": false,
        "*": false,
        "/": false,
        "#": false,
        "\u27E1": false,
      },
      utilities: {
        C: false,
        CE: false,
        GRAPH: true,
      },
      execution: {
        "=": false,
        "++": true,
        "\u23EF": false,
      },
      maxSlots: 1,
      maxTotalDigits: 2,
    },
    completedUnlockIds: [],
  };
};
