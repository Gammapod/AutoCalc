import type {
  Action,
  CalculatorId,
  ControlEquation,
  ControlField,
  GameState,
  KeyInput,
  LambdaControl,
  VisualizerId,
} from "./types.js";

export type DomainEvent =
  | { type: "KeyPressed"; key: KeyInput; calculatorId?: CalculatorId }
  | { type: "RunResetRequested" }
  | { type: "SaveHydrated"; state: GameState }
  | { type: "UnlockAllRequested" }
  | { type: "KeySlotMoved"; fromIndex: number; toIndex: number }
  | { type: "KeySlotsSwapped"; firstIndex: number; secondIndex: number }
  | {
      type: "LayoutCellMoved";
      fromSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage";
      fromIndex: number;
      toSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage";
      toIndex: number;
    }
  | {
      type: "LayoutCellsSwapped";
      fromSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage";
      fromIndex: number;
      toSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage";
      toIndex: number;
    }
  | { type: "KeypadDimensionsSet"; columns: number; rows: number }
  | { type: "KeypadRowUpgraded" }
  | { type: "KeypadColumnUpgraded" }
  | { type: "FlagToggled"; flag: string; calculatorId?: CalculatorId }
  | { type: "VisualizerToggled"; visualizer: VisualizerId; calculatorId?: CalculatorId }
  | { type: "AllocatorAdjusted"; field: "width" | "height" | "range" | "speed" | "slots"; delta: 1 | -1; calculatorId?: CalculatorId }
  | { type: "AllocatorMaxPointsSet"; value: number; calculatorId?: CalculatorId }
  | { type: "AllocatorMaxPointsAdded"; amount: number; calculatorId?: CalculatorId }
  | { type: "AllocatorDeviceResetRequested"; calculatorId?: CalculatorId }
  | { type: "AllocatorReturnPressed"; calculatorId?: CalculatorId }
  | { type: "AllocatorAllocatePressed"; calculatorId?: CalculatorId }
  | { type: "LambdaControlSet"; value: LambdaControl; calculatorId?: CalculatorId }
  | { type: "SessionControlEquationsSet"; calculatorId: CalculatorId; equations: Record<ControlField, ControlEquation> }
  | { type: "ActiveCalculatorSet"; calculatorId: CalculatorId }
  | { type: "AutoStepTicked"; calculatorId?: CalculatorId };

const assertNever = (value: never): never => {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
};

export const eventFromAction = (action: Action): DomainEvent => {
  if (action.type === "PRESS_KEY") {
    return { type: "KeyPressed", key: action.key, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "RESET_RUN") {
    return { type: "RunResetRequested" };
  }
  if (action.type === "HYDRATE_SAVE") {
    return { type: "SaveHydrated", state: action.state };
  }
  if (action.type === "UNLOCK_ALL") {
    return { type: "UnlockAllRequested" };
  }
  if (action.type === "MOVE_KEY_SLOT") {
    return { type: "KeySlotMoved", fromIndex: action.fromIndex, toIndex: action.toIndex };
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    return { type: "KeySlotsSwapped", firstIndex: action.firstIndex, secondIndex: action.secondIndex };
  }
  if (action.type === "MOVE_LAYOUT_CELL") {
    return {
      type: "LayoutCellMoved",
      fromSurface: action.fromSurface,
      fromIndex: action.fromIndex,
      toSurface: action.toSurface,
      toIndex: action.toIndex,
    };
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    return {
      type: "LayoutCellsSwapped",
      fromSurface: action.fromSurface,
      fromIndex: action.fromIndex,
      toSurface: action.toSurface,
      toIndex: action.toIndex,
    };
  }
  if (action.type === "SET_KEYPAD_DIMENSIONS") {
    return {
      type: "KeypadDimensionsSet",
      columns: action.columns,
      rows: action.rows,
    };
  }
  if (action.type === "UPGRADE_KEYPAD_ROW") {
    return { type: "KeypadRowUpgraded" };
  }
  if (action.type === "UPGRADE_KEYPAD_COLUMN") {
    return { type: "KeypadColumnUpgraded" };
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return { type: "VisualizerToggled", visualizer: action.visualizer, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "ALLOCATOR_ADJUST") {
    return { type: "AllocatorAdjusted", field: action.field, delta: action.delta, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "ALLOCATOR_SET_MAX_POINTS") {
    return { type: "AllocatorMaxPointsSet", value: action.value, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "ALLOCATOR_ADD_MAX_POINTS") {
    return { type: "AllocatorMaxPointsAdded", amount: action.amount, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "RESET_ALLOCATOR_DEVICE") {
    return { type: "AllocatorDeviceResetRequested", ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "ALLOCATOR_RETURN_PRESSED") {
    return { type: "AllocatorReturnPressed", ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "ALLOCATOR_ALLOCATE_PRESSED") {
    return { type: "AllocatorAllocatePressed", ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "LAMBDA_SET_CONTROL") {
    return { type: "LambdaControlSet", value: action.value, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "SET_SESSION_CONTROL_EQUATIONS") {
    return { type: "SessionControlEquationsSet", calculatorId: action.calculatorId, equations: action.equations };
  }
  if (action.type === "TOGGLE_FLAG") {
    return { type: "FlagToggled", flag: action.flag, ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  if (action.type === "SET_ACTIVE_CALCULATOR") {
    return { type: "ActiveCalculatorSet", calculatorId: action.calculatorId };
  }
  if (action.type === "AUTO_STEP_TICK") {
    return { type: "AutoStepTicked", ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}) };
  }
  return assertNever(action);
};

export const actionFromEvent = (event: DomainEvent): Action => {
  if (event.type === "KeyPressed") {
    return { type: "PRESS_KEY", key: event.key, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "RunResetRequested") {
    return { type: "RESET_RUN" };
  }
  if (event.type === "SaveHydrated") {
    return { type: "HYDRATE_SAVE", state: event.state };
  }
  if (event.type === "UnlockAllRequested") {
    return { type: "UNLOCK_ALL" };
  }
  if (event.type === "KeySlotMoved") {
    return { type: "MOVE_KEY_SLOT", fromIndex: event.fromIndex, toIndex: event.toIndex };
  }
  if (event.type === "KeySlotsSwapped") {
    return { type: "SWAP_KEY_SLOTS", firstIndex: event.firstIndex, secondIndex: event.secondIndex };
  }
  if (event.type === "LayoutCellMoved") {
    return {
      type: "MOVE_LAYOUT_CELL",
      fromSurface: event.fromSurface,
      fromIndex: event.fromIndex,
      toSurface: event.toSurface,
      toIndex: event.toIndex,
    };
  }
  if (event.type === "LayoutCellsSwapped") {
    return {
      type: "SWAP_LAYOUT_CELLS",
      fromSurface: event.fromSurface,
      fromIndex: event.fromIndex,
      toSurface: event.toSurface,
      toIndex: event.toIndex,
    };
  }
  if (event.type === "KeypadDimensionsSet") {
    return {
      type: "SET_KEYPAD_DIMENSIONS",
      columns: event.columns,
      rows: event.rows,
    };
  }
  if (event.type === "KeypadRowUpgraded") {
    return { type: "UPGRADE_KEYPAD_ROW" };
  }
  if (event.type === "KeypadColumnUpgraded") {
    return { type: "UPGRADE_KEYPAD_COLUMN" };
  }
  if (event.type === "VisualizerToggled") {
    return { type: "TOGGLE_VISUALIZER", visualizer: event.visualizer, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorAdjusted") {
    return { type: "ALLOCATOR_ADJUST", field: event.field, delta: event.delta, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorMaxPointsSet") {
    return { type: "ALLOCATOR_SET_MAX_POINTS", value: event.value, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorMaxPointsAdded") {
    return { type: "ALLOCATOR_ADD_MAX_POINTS", amount: event.amount, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorDeviceResetRequested") {
    return { type: "RESET_ALLOCATOR_DEVICE", ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorReturnPressed") {
    return { type: "ALLOCATOR_RETURN_PRESSED", ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "AllocatorAllocatePressed") {
    return { type: "ALLOCATOR_ALLOCATE_PRESSED", ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "LambdaControlSet") {
    return { type: "LAMBDA_SET_CONTROL", value: event.value, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "SessionControlEquationsSet") {
    return { type: "SET_SESSION_CONTROL_EQUATIONS", calculatorId: event.calculatorId, equations: event.equations };
  }
  if (event.type === "FlagToggled") {
    return { type: "TOGGLE_FLAG", flag: event.flag, ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  if (event.type === "ActiveCalculatorSet") {
    return { type: "SET_ACTIVE_CALCULATOR", calculatorId: event.calculatorId };
  }
  if (event.type === "AutoStepTicked") {
    return { type: "AUTO_STEP_TICK", ...(event.calculatorId ? { calculatorId: event.calculatorId } : {}) };
  }
  return assertNever(event);
};
