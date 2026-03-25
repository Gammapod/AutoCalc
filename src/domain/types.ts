import type {
  ButtonCategory,
  ButtonVisualizerId,
} from "./buttonRegistry.js";
import type {
  BinaryOperatorKeyId,
  DigitKeyId,
  ExecKeyId,
  KeyId,
  MemoryKeyId,
  UtilityKeyId,
  UnaryOperatorKeyId,
  ValueAtomKeyId,
  VisualizerKeyId,
} from "./keyPresentation.js";


export type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type BinarySlotOperator = BinaryOperatorKeyId;
export type UnaryOperatorKey = UnaryOperatorKeyId;
export type UnaryOperator = UnaryOperatorKey;
export type UnarySlotOperator = UnaryOperator;
export type SlotOperator = BinarySlotOperator | UnarySlotOperator;
export type ValueAtomKey = ValueAtomKeyId;
export type ValueComposeKey = never;
export type ValueExpressionKey = ValueAtomKey | ValueComposeKey;
export type UtilityKey = UtilityKeyId;
export type MemoryKey = MemoryKeyId;
export type StepKey = never;
export type VisualizerKey = VisualizerKeyId;
export type VisualizerId = ButtonVisualizerId;
export type ActiveVisualizer = "total" | VisualizerId;
export type MemoryVariable = "\u03B1" | "\u03B2" | "\u03B3";
export type CalculatorId = "g" | "f";
export type ExecKey = ExecKeyId;
export type Key = KeyId;
export type CanonicalKeyId = KeyId;
export type KeyInput = KeyId;
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

export type BinarySlot = {
  kind?: "binary";
  operator: BinarySlotOperator;
  operand: SlotOperand;
};

export type UnarySlot = {
  kind: "unary";
  operator: UnarySlotOperator;
};

export type Slot = BinarySlot | UnarySlot;

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

export type ErrorCode = "x\u2209[-R,R]" | "n/0" | "NaN" | "ALG";

export type ExecutionErrorKind = "overflow" | "division_by_zero" | "nan_input" | "symbolic_result";

export type SymbolicRollPayload = {
  // Canonical symbolic evaluation payload used by algebraic visualizer.
  // Present for both rational-accepted symbolic executions and ALG-rejected symbolic executions.
  exprText: string;
  truncated: boolean;
  renderText: string;
};

export type PrimeFactorTerm = {
  prime: bigint;
  exponent: number;
};

export type RationalPrimeFactorization = {
  sign: -1 | 1;
  numerator: PrimeFactorTerm[];
  denominator: PrimeFactorTerm[];
};

export type RollEntryOrigin = "normal" | "roll_inverse";

export type RollEntry = {
  y: CalculatorValue;
  remainder?: RationalValue;
  error?: {
    code: ErrorCode;
    kind: ExecutionErrorKind;
  };
  symbolic?: SymbolicRollPayload;
  factorization?: RationalPrimeFactorization;
  d1?: RationalValue | null;
  d2?: RationalValue | null;
  r1?: RationalValue | null;
  seedMinus1Y?: CalculatorValue | null;
  seedPlus1Y?: CalculatorValue | null;
  origin?: RollEntryOrigin;
  analysisIgnored?: boolean;
};

export type RollCycleMetadata = {
  i: number;
  j: number;
  transientLength: number;
  periodLength: number;
};

export type RollAnalysisState = {
  stopReason: "none" | "invalid" | "cycle";
  cycle: RollCycleMetadata | null;
};

export type RollDomainType = "natural" | "non_positive_integer" | "rational_non_integer";

export type DraftingSlot = {
  operator: BinarySlotOperator;
  operandInput: string;
  isNegative: boolean;
};

export type StepProgressState = {
  active: boolean;
  seedTotal: CalculatorValue | null;
  currentTotal: CalculatorValue | null;
  nextSlotIndex: number;
  executedSlotResults: CalculatorValue[];
};

export type CalculatorState = {
  total: CalculatorValue;
  pendingNegativeTotal: boolean;
  singleDigitInitialTotalEntry: boolean;
  rollEntries: RollEntry[];
  rollAnalysis: RollAnalysisState;
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
  stepProgress: StepProgressState;
};

export type UnlockState = {
  valueAtoms: Record<ValueAtomKey, boolean>;
  valueCompose: Record<ValueComposeKey, boolean>;
  // Legacy mirror kept for compatibility while tests and fixtures migrate.
  valueExpression: Record<ValueExpressionKey, boolean>;
  slotOperators: Record<SlotOperator, boolean>;
  unaryOperators: Record<UnaryOperatorKey, boolean>;
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
export type ControlField = "alpha" | "beta" | "gamma" | "delta" | "epsilon";

export type ControlFieldBounds = {
  min: number;
  max: number | null;
};

export type ControlEquation = {
  coefficients: Record<ControlField, number>;
  constant: number;
};

export type ControlProfile = {
  id: CalculatorId;
  starts: Record<ControlField, number>;
  settable: Record<ControlField, boolean>;
  bounds: Record<ControlField, ControlFieldBounds>;
  equations: Record<ControlField, ControlEquation>;
  rounding: "floor";
  gammaMinAfterOne?: boolean;
};

export type ControlProjectionFields = Record<ControlField, number>;

export type ControlProjectionBudget = {
  spent: number;
  unused: number;
  maxPoints: number;
};

export type ControlProjection = {
  calculatorId: CalculatorId;
  profile: ControlProfile;
  control: LambdaControl;
  fields: ControlProjectionFields;
  budget: ControlProjectionBudget;
  allocator: AllocatorState;
  keypadColumns: number;
  keypadRows: number;
  maxSlots: number;
  maxTotalDigits: number;
  deltaEffective: number;
  epsilonEffective: RationalValue;
  gammaMinRaised: boolean;
  autoEqualsRateMultiplier: number;
};

export type LambdaControl = {
  maxPoints: number;
  alpha: number;
  beta: number;
  gamma: number;
  gammaMinRaised?: boolean;
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
  endValue?: bigint;
};

export type GrowthOrder = "linear" | "exponential";

export type RollEndsWithGrowthOrderRunPredicate = {
  type: "roll_ends_with_growth_order_run";
  order: GrowthOrder;
  length: number;
};

export type RollCycleIsOppositePairPredicate = {
  type: "roll_cycle_is_opposite_pair";
};

export type AnyErrorSeenPredicate = {
  type: "any_error_seen";
};

export type KeysUnlockedAllPredicate = {
  type: "keys_unlocked_all";
  keys: Key[];
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

export type CompletedUnlockIdSeenPredicate = {
  type: "completed_unlock_id_seen";
  unlockId: string;
};

export type RollCyclePeriodAtLeastPredicate = {
  type: "roll_cycle_period_at_least";
  length: number;
};

export type RollCycleTransientAtLeastPredicate = {
  type: "roll_cycle_transient_at_least";
  length: number;
};

export type RollCycleDiameterAtLeastPredicate = {
  type: "roll_cycle_diameter_at_least";
  diameter: bigint;
};

export type RollTailPowersOfTwoRunPredicate = {
  type: "roll_tail_powers_of_two_run";
  length: number;
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
  | RollEndsWithGrowthOrderRunPredicate
  | RollCycleIsOppositePairPredicate
  | AnyErrorSeenPredicate
  | KeysUnlockedAllPredicate
  | KeyPressCountAtLeastPredicate
  | OverflowErrorSeenPredicate
  | DivisionByZeroErrorSeenPredicate
  | SymbolicErrorSeenPredicate
  | AllocatorReturnPressCountAtLeastPredicate
  | AllocatorAllocatePressCountAtLeastPredicate
  | KeypadKeySlotsAtLeastPredicate
  | LambdaSpentPointsDroppedToZeroSeenPredicate
  | CompletedUnlockIdSeenPredicate
  | RollCyclePeriodAtLeastPredicate
  | RollCycleTransientAtLeastPredicate
  | RollCycleDiameterAtLeastPredicate
  | RollTailPowersOfTwoRunPredicate;

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

export type IncreaseAllocatorMaxPointsForCalculatorEffect = {
  type: "increase_allocator_max_points_for_calculator";
  calculatorId: CalculatorId;
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

export type UnlockCalculatorEffect = {
  type: "unlock_calculator";
  calculatorId: CalculatorId;
};

export type UnlockEffect =
  | UnlockUtilityEffect
  | UnlockMemoryEffect
  | IncreaseMaxTotalDigitsEffect
  | IncreaseAllocatorMaxPointsEffect
  | IncreaseAllocatorMaxPointsForCalculatorEffect
  | UnlockSlotOperatorEffect
  | UnlockExecutionEffect
  | UnlockVisualizerEffect
  | UnlockDigitEffect
  | UnlockSecondSlotEffect
  | UpgradeKeypadColumnEffect
  | UpgradeKeypadRowEffect
  | MoveKeyToCoordEffect
  | UnlockCalculatorEffect;

export type NumberDomainNodeId = "NN" | "NZ" | "NQ" | "NA" | "NR" | "NC";

export type UnlockDefinition = {
  id: string;
  description: string;
  predicate: UnlockPredicate;
  effect: UnlockEffect;
  sufficientKeySets: SufficiencyRequirement[][];
  once: boolean;
  difficulty?: "normal" | "difficult";
  domainNodeId: NumberDomainNodeId;
  targetNodeId: string;
  targetLabel?: string;
};

export type SufficiencyToken = "digit_nonzero";
export type SufficiencyRequirement = Key | SufficiencyToken;

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
  perCalculatorCompletedUnlockIds?: Partial<Record<CalculatorId, string[]>>;
  sessionControlProfiles?: Partial<Record<CalculatorId, ControlProfile>>;
  calculators?: Partial<Record<CalculatorId, CalculatorInstanceState>>;
  calculatorOrder?: CalculatorId[];
  activeCalculatorId?: CalculatorId;
};

export type CalculatorInstanceState = {
  id: CalculatorId;
  symbol: CalculatorId;
  calculator: CalculatorState;
  lambdaControl: LambdaControl;
  allocator: AllocatorState;
  ui: GameState["ui"];
};

export type PressKeyAction = {
  type: "PRESS_KEY";
  key: KeyInput;
  calculatorId?: CalculatorId;
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

export type LayoutSurface = "keypad" | "keypad_f" | "keypad_g" | "storage";

export type MoveLayoutCellAction = {
  type: "MOVE_LAYOUT_CELL";
  fromSurface: LayoutSurface;
  fromIndex: number;
  toSurface: LayoutSurface;
  toIndex: number;
  calculatorId?: CalculatorId;
};

export type SwapLayoutCellsAction = {
  type: "SWAP_LAYOUT_CELLS";
  fromSurface: LayoutSurface;
  fromIndex: number;
  toSurface: LayoutSurface;
  toIndex: number;
  calculatorId?: CalculatorId;
};

export type SetKeypadDimensionsAction = {
  type: "SET_KEYPAD_DIMENSIONS";
  columns: number;
  rows: number;
  calculatorId?: CalculatorId;
};

export type UpgradeKeypadRowAction = {
  type: "UPGRADE_KEYPAD_ROW";
  calculatorId?: CalculatorId;
};

export type UpgradeKeypadColumnAction = {
  type: "UPGRADE_KEYPAD_COLUMN";
  calculatorId?: CalculatorId;
};

export type ToggleFlagAction = {
  type: "TOGGLE_FLAG";
  flag: string;
  calculatorId?: CalculatorId;
};

export type ToggleVisualizerAction = {
  type: "TOGGLE_VISUALIZER";
  visualizer: VisualizerId;
  calculatorId?: CalculatorId;
};

export type AllocatorAdjustAction = {
  type: "ALLOCATOR_ADJUST";
  field: AllocatorAllocationField;
  delta: 1 | -1;
  calculatorId?: CalculatorId;
};

export type AllocatorSetMaxPointsAction = {
  type: "ALLOCATOR_SET_MAX_POINTS";
  value: number;
  calculatorId?: CalculatorId;
};

export type AllocatorAddMaxPointsAction = {
  type: "ALLOCATOR_ADD_MAX_POINTS";
  amount: number;
  calculatorId?: CalculatorId;
};

export type ResetAllocatorDeviceAction = {
  type: "RESET_ALLOCATOR_DEVICE";
  calculatorId?: CalculatorId;
};

export type AllocatorReturnPressedAction = {
  type: "ALLOCATOR_RETURN_PRESSED";
  calculatorId?: CalculatorId;
};

export type AllocatorAllocatePressedAction = {
  type: "ALLOCATOR_ALLOCATE_PRESSED";
  calculatorId?: CalculatorId;
};

export type LambdaSetControlAction = {
  type: "LAMBDA_SET_CONTROL";
  value: LambdaControl;
  calculatorId?: CalculatorId;
};

export type SetSessionControlEquationsAction = {
  type: "SET_SESSION_CONTROL_EQUATIONS";
  calculatorId: CalculatorId;
  equations: Record<ControlField, ControlEquation>;
};

export type SetActiveCalculatorAction = {
  type: "SET_ACTIVE_CALCULATOR";
  calculatorId: CalculatorId;
};

export type AutoStepTickAction = {
  type: "AUTO_STEP_TICK";
  calculatorId?: CalculatorId;
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
  | LambdaSetControlAction
  | SetSessionControlEquationsAction
  | SetActiveCalculatorAction
  | AutoStepTickAction;

export type UiEffect =
  | {
      type: "execution_gate_rejected";
      calculatorId: CalculatorId;
    };

export type Store = {
  getState: () => GameState;
  dispatch: (action: Action) => Action;
  subscribe: (subscriber: (state: GameState) => void) => () => void;
  consumeUiEffects?: () => UiEffect[];
};






