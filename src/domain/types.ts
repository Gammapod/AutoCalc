import type {
  ButtonCategory,
  ButtonKey,
  ButtonKeyByBehaviorKind,
  ButtonKeyByUnlockGroup,
  ButtonVisualizerId,
} from "./buttonRegistry.js";

export type Digit = Extract<ButtonKeyByBehaviorKind<"digit">, "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9">;
export type SlotOperator = ButtonKeyByUnlockGroup<"slotOperators">;
export type ValueAtomKey = ButtonKeyByUnlockGroup<"valueAtoms">;
export type ValueComposeKey = ButtonKeyByUnlockGroup<"valueCompose">;
export type ValueExpressionKey = ValueAtomKey | ValueComposeKey;
export type UtilityKey = ButtonKeyByUnlockGroup<"utilities">;
export type MemoryKey = ButtonKeyByUnlockGroup<"memory">;
export type StepKey = ButtonKeyByUnlockGroup<"steps">;
export type VisualizerKey = ButtonKeyByUnlockGroup<"visualizers">;
export type VisualizerId = ButtonVisualizerId;
export type ActiveVisualizer = "total" | VisualizerId;
export type MemoryVariable = "α" | "β" | "γ";
export type ExecKey = ButtonKeyByUnlockGroup<"execution">;
export type Key = ButtonKey;
export type KeyCategory = ButtonCategory;
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
  operand: SlotOperand;
};

export type RationalValue = {
  num: bigint;
  den: bigint;
};

export type ExpressionConstant = "pi" | "e";

export type IntLiteralExpr = {
  type: "int_literal";
  value: bigint;
};

export type RationalLiteralExpr = {
  type: "rational_literal";
  value: RationalValue;
};

export type ConstantExpr = {
  type: "constant";
  value: ExpressionConstant;
};

export type UnaryExprOp = "neg" | "ln" | "sqrt";

export type UnaryExpr = {
  type: "unary";
  op: UnaryExprOp;
  arg: ExpressionValue;
};

export type BinaryExprOp = "add" | "sub" | "mul" | "div";

export type BinaryExpr = {
  type: "binary";
  op: BinaryExprOp;
  left: ExpressionValue;
  right: ExpressionValue;
};

export type SymbolicExpr = {
  type: "symbolic";
  text: string;
};

export type ExpressionValue =
  | IntLiteralExpr
  | RationalLiteralExpr
  | ConstantExpr
  | UnaryExpr
  | BinaryExpr
  | SymbolicExpr;

export type SlotOperand = bigint | ExpressionValue;

export type CalculatorValue =
  | {
      kind: "rational";
      value: RationalValue;
    }
  | {
      kind: "expr";
      value: ExpressionValue;
    }
  | {
      kind: "nan";
    };

export type ErrorCode = "x∉[-R,R]" | "n/0" | "NaN" | "ALG";

export type ExecutionErrorKind = "overflow" | "division_by_zero" | "nan_input" | "symbolic_result";

export type SymbolicRollPayload = {
  // Canonical symbolic evaluation payload used by algebraic visualizer.
  // Present for both rational-accepted symbolic executions and ALG-rejected symbolic executions.
  exprText: string;
  truncated: boolean;
  renderText: string;
};

export type RollEntry = {
  y: CalculatorValue;
  remainder?: RationalValue;
  error?: {
    code: ErrorCode;
    kind: ExecutionErrorKind;
  };
  symbolic?: SymbolicRollPayload;
};

export type RollDomainType = "natural" | "non_positive_integer" | "rational_non_integer";

export type DraftingSlot = {
  operator: SlotOperator;
  operandInput: string;
  isNegative: boolean;
};

export type CalculatorState = {
  total: CalculatorValue;
  seedSnapshot?: CalculatorValue;
  pendingNegativeTotal: boolean;
  singleDigitInitialTotalEntry: boolean;
  rollEntries: RollEntry[];
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
};

export type UnlockState = {
  valueAtoms: Record<ValueAtomKey, boolean>;
  valueCompose: Record<ValueComposeKey, boolean>;
  // Legacy mirror kept for compatibility while tests and fixtures migrate.
  valueExpression: Record<ValueExpressionKey, boolean>;
  slotOperators: Record<SlotOperator, boolean>;
  utilities: Record<UtilityKey, boolean>;
  memory: Record<MemoryKey, boolean>;
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

export type LambdaAxis = "alpha" | "beta" | "gamma";

export type LambdaOverrides = {
  delta?: number;
  epsilon?: RationalValue;
};

export type LambdaControl = {
  maxPoints: number;
  alpha: number;
  beta: number;
  gamma: number;
  overrides: LambdaOverrides;
};

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

export type RollContainsDomainTypePredicate = {
  type: "roll_contains_domain_type";
  domainType: RollDomainType;
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

export type SymbolicErrorSeenPredicate = {
  type: "symbolic_error_seen";
};

export type AllocatorReturnPressCountAtLeastPredicate = {
  type: "allocator_return_press_count_at_least";
  count: number;
};

export type AllocatorAllocatePressCountAtLeastPredicate = {
  type: "allocator_allocate_press_count_at_least";
  count: number;
};

export type KeypadKeySlotsAtLeastPredicate = {
  type: "keypad_key_slots_at_least";
  slots: number;
};

export type LambdaSpentPointsDroppedToZeroSeenPredicate = {
  type: "lambda_spent_points_dropped_to_zero_seen";
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
  | RollContainsDomainTypePredicate
  | RollEndsWithEqualRunPredicate
  | RollEndsWithIncrementingRunPredicate
  | RollEndsWithAlternatingSignConstantAbsRunPredicate
  | RollEndsWithConstantStepRunPredicate
  | KeyPressCountAtLeastPredicate
  | OverflowErrorSeenPredicate
  | DivisionByZeroErrorSeenPredicate
  | SymbolicErrorSeenPredicate
  | AllocatorReturnPressCountAtLeastPredicate
  | AllocatorAllocatePressCountAtLeastPredicate
  | KeypadKeySlotsAtLeastPredicate
  | LambdaSpentPointsDroppedToZeroSeenPredicate;

export type UnlockUtilityEffect = {
  type: "unlock_utility";
  key: UtilityKey;
};

export type UnlockMemoryEffect = {
  type: "unlock_memory";
  key: MemoryKey;
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

export type UnlockVisualizerEffect = {
  type: "unlock_visualizer";
  key: VisualizerKey;
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
  | UnlockMemoryEffect
  | IncreaseMaxTotalDigitsEffect
  | IncreaseAllocatorMaxPointsEffect
  | UnlockSlotOperatorEffect
  | UnlockExecutionEffect
  | UnlockVisualizerEffect
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
  lambdaControl: LambdaControl;
  // Legacy projection snapshot kept for compatibility while remaining consumers migrate.
  allocator: AllocatorState;
  ui: {
    keyLayout: LayoutCell[];
    keypadCells: KeypadCellRecord[];
    storageLayout: Array<KeyCell | null>;
    keypadColumns: number;
    keypadRows: number;
    activeVisualizer: ActiveVisualizer;
    memoryVariable: MemoryVariable;
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

export type LambdaSetOverrideDeltaAction = {
  type: "LAMBDA_SET_OVERRIDE_DELTA";
  value: number;
};

export type LambdaSetOverrideEpsilonAction = {
  type: "LAMBDA_SET_OVERRIDE_EPSILON";
  value: RationalValue;
};

export type LambdaClearOverrideDeltaAction = {
  type: "LAMBDA_CLEAR_OVERRIDE_DELTA";
};

export type LambdaClearOverrideEpsilonAction = {
  type: "LAMBDA_CLEAR_OVERRIDE_EPSILON";
};

export type LambdaSetControlAction = {
  type: "LAMBDA_SET_CONTROL";
  value: LambdaControl;
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
  | AllocatorAllocatePressedAction
  | LambdaSetOverrideDeltaAction
  | LambdaSetOverrideEpsilonAction
  | LambdaClearOverrideDeltaAction
  | LambdaClearOverrideEpsilonAction
  | LambdaSetControlAction;

export type Store = {
  getState: () => GameState;
  dispatch: (action: Action) => Action;
  subscribe: (subscriber: (state: GameState) => void) => () => void;
};


