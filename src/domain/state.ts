import type { GameState, KeyCell, LayoutCell } from "./types.js";

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 4;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";
export const STORAGE_COLUMNS = 8;
export const STORAGE_INITIAL_ROWS = 1;
export const STORAGE_INITIAL_SLOTS = STORAGE_COLUMNS * STORAGE_INITIAL_ROWS;

export const defaultStorageKeys = (): KeyCell[] =>
  defaultKeyLayout()
    .filter((cell): cell is KeyCell => cell.kind === "key")
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

export const defaultDrawerKeyLayout = (): LayoutCell[] =>
  defaultKeyLayout().map((cell) => (cell.kind === "placeholder" ? cell : { kind: "placeholder", area: "empty" }));

export const defaultKeyLayout = (): LayoutCell[] => [
  { kind: "placeholder", area: "graph" },
  { kind: "placeholder", area: "empty" },
  { kind: "key", key: "CE" },
  { kind: "key", key: "C" },
  { kind: "key", key: "/" },
  { kind: "key", key: "⟡" },
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
  { kind: "key", key: "NEG" },
];

export const initialState = (): GameState => ({
  calculator: {
    total: { num: 0n, den: 1n },
    pendingNegativeTotal: false,
    roll: [],
    euclidRemainders: [],
    operationSlots: [],
    draftingSlot: null,
  },
  ui: {
    keyLayout: defaultDrawerKeyLayout(),
    storageLayout: defaultStorageLayout(),
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
      "⟡": false,
    },
    utilities: {
      C: false,
      CE: false,
    },
    execution: {
      "=": false,
    },
    maxSlots: 1,
    maxTotalDigits: 2,
  },
  completedUnlockIds: [],
});

