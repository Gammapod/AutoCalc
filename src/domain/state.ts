import type { GameState, LayoutCell } from "./types.js";

export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 1;
export const CHECKLIST_UNLOCK_ID = "unlock_checklist_on_first_c_press";

export const defaultKeyLayout = (): LayoutCell[] => [
  { kind: "key", key: "C" },
  { kind: "key", key: "CE" },
  { kind: "placeholder", area: "mul" },
  { kind: "placeholder", area: "div" },
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
  { kind: "key", key: "=", tall: true },
  { kind: "key", key: "0", wide: true },
  { kind: "placeholder", area: "dot" },
];

export const initialState = (): GameState => ({
  calculator: {
    total: 0n,
    roll: [],
    operationSlots: [],
    draftingSlot: null,
  },
  ui: {
    keyLayout: defaultKeyLayout(),
  },
  unlocks: {
    digits: {
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
    },
    slotOperators: {
      "+": false,
      "-": false,
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
