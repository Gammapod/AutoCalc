export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SlotOperator = "+";
export type UtilityKey = "C" | "CE";
export type ExecKey = "=";
export type Key = Digit | SlotOperator | UtilityKey | ExecKey;

export type KeyCell = {
  kind: "key";
  key: Key;
  wide?: boolean;
  tall?: boolean;
};

export type PlaceholderCell = {
  kind: "placeholder";
  area: string;
};

export type LayoutCell = KeyCell | PlaceholderCell;

export type Slot = {
  operator: SlotOperator;
  operand: bigint;
};

export type DraftingSlot = {
  operator: SlotOperator;
  operandInput: string;
};

export type CalculatorState = {
  total: bigint;
  roll: bigint[];
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
};

export type UnlockState = {
  digits: Record<Digit, boolean>;
  slotOperators: Record<SlotOperator, boolean>;
  utilities: Record<UtilityKey, boolean>;
  maxSlots: number;
};

export type RollLengthAtLeastPredicate = {
  type: "roll_length_at_least";
  length: number;
};

export type UnlockPredicate = RollLengthAtLeastPredicate;

export type UnlockEffect = {
  type: "unlock_utility";
  key: UtilityKey;
};

export type UnlockDefinition = {
  id: string;
  description: string;
  predicate: UnlockPredicate;
  effect: UnlockEffect;
  once: boolean;
};

export type GameState = {
  calculator: CalculatorState;
  ui: {
    keyLayout: LayoutCell[];
  };
  unlocks: UnlockState;
  completedUnlockIds: string[];
};

export type PressKeyAction = {
  type: "PRESS_KEY";
  key: Key;
};

export type ResetRunAction = {
  type: "RESET_RUN";
};

export type HydrateSaveAction = {
  type: "HYDRATE_SAVE";
  state: GameState;
};

export type MoveKeySlotAction = {
  type: "MOVE_KEY_SLOT";
  fromIndex: number;
  toIndex: number;
};

export type SwapKeySlotsAction = {
  type: "SWAP_KEY_SLOTS";
  firstIndex: number;
  secondIndex: number;
};

export type Action =
  | PressKeyAction
  | ResetRunAction
  | HydrateSaveAction
  | MoveKeySlotAction
  | SwapKeySlotsAction;

export type Store = {
  getState: () => GameState;
  dispatch: (action: Action) => Action;
  subscribe: (subscriber: (state: GameState) => void) => () => void;
};
