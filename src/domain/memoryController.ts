import type { ControlField, Digit, GameState, Key } from "./types.js";
import { adjustAxis } from "./lambdaControl.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import { isMemoryKeyId, KEY_ID, resolveKeyId } from "./keyPresentation.js";
import { projectControlFromState } from "./controlProjection.js";
import { getSettableControlFields } from "./controlSelection.js";

const controlFieldToAdjustableAxis = (controlField: ControlField): "alpha" | "beta" | "gamma" | null => {
  if (controlField === "alpha" || controlField === "beta" || controlField === "gamma") {
    return controlField;
  }
  return null;
};

const resolveSelectedControlField = (state: GameState): ControlField | null => {
  const projection = projectControlFromState(state);
  const settableFields = getSettableControlFields(projection.profile);
  if (settableFields.length === 0) {
    return null;
  }
  const selected = state.ui.selectedControlField;
  if (selected && settableFields.includes(selected)) {
    return selected;
  }
  return settableFields[0];
};

const readSelectedMemoryValue = (state: GameState): number => {
  const selectedControlField = resolveSelectedControlField(state);
  if (!selectedControlField) {
    return 0;
  }
  return projectControlFromState(state).fields[selectedControlField];
};

export const isMemoryKey = (key: Key): boolean => isMemoryKeyId(key);

export const cycleMemoryVariable = (state: GameState): GameState => {
  const projection = projectControlFromState(state);
  const settableFields = getSettableControlFields(projection.profile);
  if (settableFields.length === 0) {
    if (state.ui.selectedControlField === null) {
      return state;
    }
    return {
      ...state,
      ui: {
        ...state.ui,
        selectedControlField: null,
      },
    };
  }
  const selected = resolveSelectedControlField(state);
  const currentIndex = selected ? settableFields.indexOf(selected) : -1;
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % settableFields.length : 0;
  const nextField = settableFields[nextIndex] ?? null;
  if (nextField === state.ui.selectedControlField) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      selectedControlField: nextField,
    },
  };
};

export const resolveMemoryRecallDigit = (state: GameState): Digit | null => {
  if (!resolveSelectedControlField(state)) {
    return null;
  }
  const memoryValue = readSelectedMemoryValue(state);
  const digitValue = Math.max(0, Math.min(9, Math.trunc(memoryValue)));
  return digitValue.toString() as Digit;
};

export const applyMemoryAdjust = (state: GameState, delta: 1 | -1): GameState => {
  const projection = projectControlFromState(state);
  const selectedField = resolveSelectedControlField(state);
  if (!selectedField) {
    return state;
  }
  const axis = controlFieldToAdjustableAxis(selectedField);
  if (!axis) {
    return state;
  }
  const nextControl = adjustAxis(projection.control, projection.profile, axis, delta);
  if (nextControl === projection.control) {
    return state;
  }
  return applyAllocatorRuntimeProjection(state, nextControl);
};

export const isMemoryCycleKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_cycle_variable;
export const isMemoryRecallKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_recall;
export const isMemoryPlusKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_adjust_plus;
export const isMemoryMinusKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_adjust_minus;
