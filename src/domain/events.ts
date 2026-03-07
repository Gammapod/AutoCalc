import type { Action, GameState, Key, LambdaControl, VisualizerId } from "./types.js";

export type DomainEvent =
  | { type: "KeyPressed"; key: Key }
  | { type: "RunResetRequested" }
  | { type: "SaveHydrated"; state: GameState }
  | { type: "UnlockAllRequested" }
  | { type: "KeySlotMoved"; fromIndex: number; toIndex: number }
  | { type: "KeySlotsSwapped"; firstIndex: number; secondIndex: number }
  | { type: "LayoutCellMoved"; fromSurface: "keypad" | "storage"; fromIndex: number; toSurface: "keypad" | "storage"; toIndex: number }
  | {
      type: "LayoutCellsSwapped";
      fromSurface: "keypad" | "storage";
      fromIndex: number;
      toSurface: "keypad" | "storage";
      toIndex: number;
    }
  | { type: "KeypadDimensionsSet"; columns: number; rows: number }
  | { type: "KeypadRowUpgraded" }
  | { type: "KeypadColumnUpgraded" }
  | { type: "FlagToggled"; flag: string }
  | { type: "VisualizerToggled"; visualizer: VisualizerId }
  | { type: "AllocatorAdjusted"; field: "width" | "height" | "range" | "speed" | "slots"; delta: 1 | -1 }
  | { type: "AllocatorMaxPointsSet"; value: number }
  | { type: "AllocatorMaxPointsAdded"; amount: number }
  | { type: "AllocatorDeviceResetRequested" }
  | { type: "AllocatorReturnPressed" }
  | { type: "AllocatorAllocatePressed" }
  | { type: "LambdaOverrideDeltaSet"; value: number }
  | { type: "LambdaOverrideEpsilonSet"; value: { num: string; den: string } }
  | { type: "LambdaOverrideDeltaCleared" }
  | { type: "LambdaOverrideEpsilonCleared" }
  | { type: "LambdaControlSet"; value: LambdaControl };

export const eventFromAction = (action: Action): DomainEvent => {
  if (action.type === "PRESS_KEY") {
    return { type: "KeyPressed", key: action.key };
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
    return { type: "VisualizerToggled", visualizer: action.visualizer };
  }
  if (action.type === "ALLOCATOR_ADJUST") {
    return { type: "AllocatorAdjusted", field: action.field, delta: action.delta };
  }
  if (action.type === "ALLOCATOR_SET_MAX_POINTS") {
    return { type: "AllocatorMaxPointsSet", value: action.value };
  }
  if (action.type === "ALLOCATOR_ADD_MAX_POINTS") {
    return { type: "AllocatorMaxPointsAdded", amount: action.amount };
  }
  if (action.type === "RESET_ALLOCATOR_DEVICE") {
    return { type: "AllocatorDeviceResetRequested" };
  }
  if (action.type === "ALLOCATOR_RETURN_PRESSED") {
    return { type: "AllocatorReturnPressed" };
  }
  if (action.type === "ALLOCATOR_ALLOCATE_PRESSED") {
    return { type: "AllocatorAllocatePressed" };
  }
  if (action.type === "LAMBDA_SET_OVERRIDE_DELTA") {
    return { type: "LambdaOverrideDeltaSet", value: action.value };
  }
  if (action.type === "LAMBDA_SET_OVERRIDE_EPSILON") {
    return {
      type: "LambdaOverrideEpsilonSet",
      value: {
        num: action.value.num.toString(),
        den: action.value.den.toString(),
      },
    };
  }
  if (action.type === "LAMBDA_CLEAR_OVERRIDE_DELTA") {
    return { type: "LambdaOverrideDeltaCleared" };
  }
  if (action.type === "LAMBDA_CLEAR_OVERRIDE_EPSILON") {
    return { type: "LambdaOverrideEpsilonCleared" };
  }
  if (action.type === "LAMBDA_SET_CONTROL") {
    return { type: "LambdaControlSet", value: action.value };
  }
  return { type: "FlagToggled", flag: action.flag };
};

export const actionFromEvent = (event: DomainEvent): Action => {
  if (event.type === "KeyPressed") {
    return { type: "PRESS_KEY", key: event.key };
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
    return { type: "TOGGLE_VISUALIZER", visualizer: event.visualizer };
  }
  if (event.type === "AllocatorAdjusted") {
    return { type: "ALLOCATOR_ADJUST", field: event.field, delta: event.delta };
  }
  if (event.type === "AllocatorMaxPointsSet") {
    return { type: "ALLOCATOR_SET_MAX_POINTS", value: event.value };
  }
  if (event.type === "AllocatorMaxPointsAdded") {
    return { type: "ALLOCATOR_ADD_MAX_POINTS", amount: event.amount };
  }
  if (event.type === "AllocatorDeviceResetRequested") {
    return { type: "RESET_ALLOCATOR_DEVICE" };
  }
  if (event.type === "AllocatorReturnPressed") {
    return { type: "ALLOCATOR_RETURN_PRESSED" };
  }
  if (event.type === "AllocatorAllocatePressed") {
    return { type: "ALLOCATOR_ALLOCATE_PRESSED" };
  }
  if (event.type === "LambdaOverrideDeltaSet") {
    return { type: "LAMBDA_SET_OVERRIDE_DELTA", value: event.value };
  }
  if (event.type === "LambdaOverrideEpsilonSet") {
    return {
      type: "LAMBDA_SET_OVERRIDE_EPSILON",
      value: {
        num: BigInt(event.value.num),
        den: BigInt(event.value.den),
      },
    };
  }
  if (event.type === "LambdaOverrideDeltaCleared") {
    return { type: "LAMBDA_CLEAR_OVERRIDE_DELTA" };
  }
  if (event.type === "LambdaOverrideEpsilonCleared") {
    return { type: "LAMBDA_CLEAR_OVERRIDE_EPSILON" };
  }
  if (event.type === "LambdaControlSet") {
    return { type: "LAMBDA_SET_CONTROL", value: event.value };
  }
  return { type: "TOGGLE_FLAG", flag: event.flag };
};
