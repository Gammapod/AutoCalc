export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SlotOperator = "+" | "-";
export type UtilityKey = "C" | "CE" | "NEG";
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
  isNegative: boolean;
};

export type CalculatorState = {
  total: bigint;
  pendingNegativeTotal: boolean;
  roll: bigint[];
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
};

export type UnlockState = {
  digits: Record<Digit, boolean>;
  slotOperators: Record<SlotOperator, boolean>;
  utilities: Record<UtilityKey, boolean>;
  execution: Record<ExecKey, boolean>;
  maxSlots: number;
  maxTotalDigits: number;
};

export type RollLengthAtLeastPredicate = {
  type: "roll_length_at_least";
  length: number;
};

export type TotalEqualsPredicate = {
  type: "total_equals";
  value: bigint;
};

export type TotalAtLeastPredicate = {
  type: "total_at_least";
  value: bigint;
};

export type TotalAtMostPredicate = {
  type: "total_at_most";
  value: bigint;
};

export type OperationEqualsPredicate = {
  type: "operation_equals";
  slots: Slot[];
  includeDrafting?: boolean;
};

export type RollEndsWithSequencePredicate = {
  type: "roll_ends_with_sequence";
  sequence: bigint[];
};

export type UnlockPredicate =
  | RollLengthAtLeastPredicate
  | TotalEqualsPredicate
  | TotalAtLeastPredicate
  | TotalAtMostPredicate
  | OperationEqualsPredicate
  | RollEndsWithSequencePredicate;

export type UnlockUtilityEffect = {
  type: "unlock_utility";
  key: UtilityKey;
};

export type IncreaseMaxTotalDigitsEffect = {
  type: "increase_max_total_digits";
  amount: number;
};

export type UnlockSlotOperatorEffect = {
  type: "unlock_slot_operator";
  key: SlotOperator;
};

export type UnlockExecutionEffect = {
  type: "unlock_execution";
  key: ExecKey;
};

export type UnlockDigitEffect = {
  type: "unlock_digit";
  key: Digit;
};

export type UnlockEffect =
  | UnlockUtilityEffect
  | IncreaseMaxTotalDigitsEffect
  | UnlockSlotOperatorEffect
  | UnlockExecutionEffect
  | UnlockDigitEffect;

export type NumberDomainNodeId = "NN" | "NZ" | "NQ" | "NA" | "NR" | "NC";

export type UnlockDefinition = {
  id: string;
  description: string;
  predicate: UnlockPredicate;
  effect: UnlockEffect;
  once: boolean;
  domainNodeId?: NumberDomainNodeId;
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

export type UnlockAllAction = {
  type: "UNLOCK_ALL";
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
  | UnlockAllAction
  | MoveKeySlotAction
  | SwapKeySlotsAction;

export type Store = {
  getState: () => GameState;
  dispatch: (action: Action) => Action;
  subscribe: (subscriber: (state: GameState) => void) => () => void;
};
