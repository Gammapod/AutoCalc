export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SlotOperator = "+" | "-" | "*" | "/" | "#" | "⟡";
export type ValueExpressionKey = Digit | "NEG";
export type UtilityKey = "C" | "CE" | "UNDO";
export type StepKey = "\u23EF";
export type VisualizerKey = "GRAPH" | "FEED";
export type VisualizerId = "graph" | "feed" | "circle";
export type ActiveVisualizer = VisualizerId | "none";
export type ExecKey = "=" | "++" | "--";
export type Key = ValueExpressionKey | SlotOperator | UtilityKey | StepKey | VisualizerKey | ExecKey;

export type KeyCell = {
  kind: "key";
  key: Key;
  behavior?: KeyButtonBehavior;
};

export type PlaceholderCell = {
  kind: "placeholder";
  area: "graph" | "empty" | "negate" | "div" | "mod" | "mul" | "euclid_divmod";
};

export type LayoutCell = KeyCell | PlaceholderCell;

export type SlotId = string;

export type KeypadCoord = {
  row: number;
  col: number;
};

export type KeypadCellRecord = {
  id: SlotId;
  row: number;
  col: number;
  cell: LayoutCell;
};

export type PressKeyButtonBehavior = {
  type: "press_key";
};

export type ToggleFlagButtonBehavior = {
  type: "toggle_flag";
  flag: string;
};

export type KeyButtonBehavior = PressKeyButtonBehavior | ToggleFlagButtonBehavior;

export type Slot = {
  operator: SlotOperator;
  operand: bigint;
};

export type RationalValue = {
  num: bigint;
  den: bigint;
};

export type CalculatorValue =
  | {
      kind: "rational";
      value: RationalValue;
    }
  | {
      kind: "nan";
    };

export type ErrorCode = "x∉[-R,R]" | "n/0" | "NaN";

export type ExecutionErrorKind = "overflow" | "division_by_zero" | "nan_input";

export type EuclidRemainderEntry = {
  rollIndex: number;
  value: RationalValue;
};

export type RollErrorEntry = {
  rollIndex: number;
  code: ErrorCode;
  kind: ExecutionErrorKind;
};

export type DraftingSlot = {
  operator: SlotOperator;
  operandInput: string;
  isNegative: boolean;
};

export type CalculatorState = {
  total: CalculatorValue;
  pendingNegativeTotal: boolean;
  singleDigitInitialTotalEntry: boolean;
  roll: CalculatorValue[];
  rollErrors: RollErrorEntry[];
  euclidRemainders: EuclidRemainderEntry[];
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
};

export type UnlockState = {
  valueExpression: Record<ValueExpressionKey, boolean>;
  slotOperators: Record<SlotOperator, boolean>;
  utilities: Record<UtilityKey, boolean>;
  steps: Record<StepKey, boolean>;
  visualizers: Record<VisualizerKey, boolean>;
  execution: Record<ExecKey, boolean>;
  uiUnlocks: {
    storageVisible: boolean;
  };
  maxSlots: number;
  maxTotalDigits: number;
};

export type AllocatorState = {
  maxPoints: number;
  allocations: {
    width: number;
    height: number;
    range: number;
    speed: number;
    slots: number;
  };
};

export type AllocatorAllocationField = keyof AllocatorState["allocations"];

export type AllocatorBudgetSnapshot = {
  spentTotal: number;
  unusedPoints: number;
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

export type TotalMagnitudeAtLeastPredicate = {
  type: "total_magnitude_at_least";
  value: bigint;
};

export type OperationEqualsPredicate = {
  type: "operation_equals";
  slots: Slot[];
  includeDrafting?: boolean;
};

export type OperationFirstEuclidEquivalentModuloPredicate = {
  type: "operation_first_euclid_equivalent_modulo";
};

export type RollEndsWithSequencePredicate = {
  type: "roll_ends_with_sequence";
  sequence: bigint[];
};

export type RollContainsValuePredicate = {
  type: "roll_contains_value";
  value: bigint;
};

export type RollEndsWithEqualRunPredicate = {
  type: "roll_ends_with_equal_run";
  length: number;
};

export type RollEndsWithIncrementingRunPredicate = {
  type: "roll_ends_with_incrementing_run";
  length: number;
  step?: bigint;
};

export type RollEndsWithAlternatingSignConstantAbsRunPredicate = {
  type: "roll_ends_with_alternating_sign_constant_abs_run";
  length: number;
};

export type RollEndsWithConstantStepRunPredicate = {
  type: "roll_ends_with_constant_step_run";
  length: number;
  minAbsStep?: bigint;
  requirePositiveStep?: boolean;
  requireNegativeStep?: boolean;
};

export type KeyPressCountAtLeastPredicate = {
  type: "key_press_count_at_least";
  key: Key;
  count: number;
};

export type OverflowErrorSeenPredicate = {
  type: "overflow_error_seen";
};

export type DivisionByZeroErrorSeenPredicate = {
  type: "division_by_zero_error_seen";
};

export type AllocatorReturnPressCountAtLeastPredicate = {
  type: "allocator_return_press_count_at_least";
  count: number;
};

export type AllocatorAllocatePressCountAtLeastPredicate = {
  type: "allocator_allocate_press_count_at_least";
  count: number;
};

export type UnlockPredicate =
  | RollLengthAtLeastPredicate
  | TotalEqualsPredicate
  | TotalAtLeastPredicate
  | TotalAtMostPredicate
  | TotalMagnitudeAtLeastPredicate
  | OperationEqualsPredicate
  | OperationFirstEuclidEquivalentModuloPredicate
  | RollEndsWithSequencePredicate
  | RollContainsValuePredicate
  | RollEndsWithEqualRunPredicate
  | RollEndsWithIncrementingRunPredicate
  | RollEndsWithAlternatingSignConstantAbsRunPredicate
  | RollEndsWithConstantStepRunPredicate
  | KeyPressCountAtLeastPredicate
  | OverflowErrorSeenPredicate
  | DivisionByZeroErrorSeenPredicate
  | AllocatorReturnPressCountAtLeastPredicate
  | AllocatorAllocatePressCountAtLeastPredicate;

export type UnlockUtilityEffect = {
  type: "unlock_utility";
  key: UtilityKey;
};

export type IncreaseMaxTotalDigitsEffect = {
  type: "increase_max_total_digits";
  amount: number;
};

export type IncreaseAllocatorMaxPointsEffect = {
  type: "increase_allocator_max_points";
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
  key: ValueExpressionKey;
};

export type UnlockSecondSlotEffect = {
  type: "unlock_second_slot";
};

export type UpgradeKeypadColumnEffect = {
  type: "upgrade_keypad_column";
};

export type UpgradeKeypadRowEffect = {
  type: "upgrade_keypad_row";
};

export type MoveKeyToCoordEffect = {
  type: "move_key_to_coord";
  key: Key;
  row: number;
  col: number;
  onOccupied: "push_to_storage";
};

export type UnlockEffect =
  | UnlockUtilityEffect
  | IncreaseMaxTotalDigitsEffect
  | IncreaseAllocatorMaxPointsEffect
  | UnlockSlotOperatorEffect
  | UnlockExecutionEffect
  | UnlockDigitEffect
  | UnlockSecondSlotEffect
  | UpgradeKeypadColumnEffect
  | UpgradeKeypadRowEffect
  | MoveKeyToCoordEffect;

export type NumberDomainNodeId = "NN" | "NZ" | "NQ" | "NA" | "NR" | "NC";

export type UnlockDefinition = {
  id: string;
  description: string;
  predicate: UnlockPredicate;
  effect: UnlockEffect;
  once: boolean;
  difficulty?: "normal" | "difficult";
  domainNodeId: NumberDomainNodeId;
  targetNodeId: string;
  targetLabel?: string;
};

export type GameState = {
  calculator: CalculatorState;
  allocator: AllocatorState;
  ui: {
    keyLayout: LayoutCell[];
    keypadCells: KeypadCellRecord[];
    storageLayout: Array<KeyCell | null>;
    keypadColumns: number;
    keypadRows: number;
    activeVisualizer: ActiveVisualizer;
    buttonFlags: Record<string, boolean>;
  };
  keyPressCounts: Partial<Record<Key, number>>;
  allocatorReturnPressCount?: number;
  allocatorAllocatePressCount?: number;
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

export type LayoutSurface = "keypad" | "storage";

export type MoveLayoutCellAction = {
  type: "MOVE_LAYOUT_CELL";
  fromSurface: LayoutSurface;
  fromIndex: number;
  toSurface: LayoutSurface;
  toIndex: number;
};

export type SwapLayoutCellsAction = {
  type: "SWAP_LAYOUT_CELLS";
  fromSurface: LayoutSurface;
  fromIndex: number;
  toSurface: LayoutSurface;
  toIndex: number;
};

export type SetKeypadDimensionsAction = {
  type: "SET_KEYPAD_DIMENSIONS";
  columns: number;
  rows: number;
};

export type UpgradeKeypadRowAction = {
  type: "UPGRADE_KEYPAD_ROW";
};

export type UpgradeKeypadColumnAction = {
  type: "UPGRADE_KEYPAD_COLUMN";
};

export type ToggleFlagAction = {
  type: "TOGGLE_FLAG";
  flag: string;
};

export type ToggleVisualizerAction = {
  type: "TOGGLE_VISUALIZER";
  visualizer: VisualizerId;
};

export type AllocatorAdjustAction = {
  type: "ALLOCATOR_ADJUST";
  field: AllocatorAllocationField;
  delta: 1 | -1;
};

export type AllocatorSetMaxPointsAction = {
  type: "ALLOCATOR_SET_MAX_POINTS";
  value: number;
};

export type AllocatorAddMaxPointsAction = {
  type: "ALLOCATOR_ADD_MAX_POINTS";
  amount: number;
};

export type ResetAllocatorDeviceAction = {
  type: "RESET_ALLOCATOR_DEVICE";
};

export type AllocatorReturnPressedAction = {
  type: "ALLOCATOR_RETURN_PRESSED";
};

export type AllocatorAllocatePressedAction = {
  type: "ALLOCATOR_ALLOCATE_PRESSED";
};

export type Action =
  | PressKeyAction
  | ResetRunAction
  | HydrateSaveAction
  | UnlockAllAction
  | MoveKeySlotAction
  | SwapKeySlotsAction
  | MoveLayoutCellAction
  | SwapLayoutCellsAction
  | SetKeypadDimensionsAction
  | UpgradeKeypadRowAction
  | UpgradeKeypadColumnAction
  | ToggleFlagAction
  | ToggleVisualizerAction
  | AllocatorAdjustAction
  | AllocatorSetMaxPointsAction
  | AllocatorAddMaxPointsAction
  | ResetAllocatorDeviceAction
  | AllocatorReturnPressedAction
  | AllocatorAllocatePressedAction;

export type Store = {
  getState: () => GameState;
  dispatch: (action: Action) => Action;
  subscribe: (subscriber: (state: GameState) => void) => () => void;
};
