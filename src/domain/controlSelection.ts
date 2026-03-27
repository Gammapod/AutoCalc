import type { ControlField, ControlProfile, GameState, MemoryVariable } from "./types.js";
import { getEffectiveControlProfile, resolveStateCalculatorId } from "./controlProfileRuntime.js";

const CONTROL_SELECTION_ORDER: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];

export const toLegacyMemoryVariable = (field: ControlField | null): MemoryVariable =>
  field === "beta" ? "β" : field === "gamma" ? "γ" : "α";

export const memoryVariableToControlField = (memoryVariable: MemoryVariable | null | undefined): ControlField =>
  memoryVariable === "β" ? "beta" : memoryVariable === "γ" ? "gamma" : "alpha";

export const getSettableControlFields = (profile: ControlProfile): ControlField[] =>
  CONTROL_SELECTION_ORDER.filter((field) => profile.settable[field]);

export const normalizeSelectedControlField = (
  profile: ControlProfile,
  selectedControlField: ControlField | null | undefined,
  legacyMemoryVariable: MemoryVariable | null | undefined,
): ControlField | null => {
  const settableFields = getSettableControlFields(profile);
  if (settableFields.length === 0) {
    return null;
  }
  if (selectedControlField && settableFields.includes(selectedControlField)) {
    return selectedControlField;
  }
  const mappedLegacy = memoryVariableToControlField(legacyMemoryVariable);
  if (settableFields.includes(mappedLegacy)) {
    return mappedLegacy;
  }
  return settableFields[0];
};

export const getNormalizedSelectedControlField = (
  state: GameState,
): { selectedControlField: ControlField | null; settableFields: ControlField[] } => {
  const profile = getEffectiveControlProfile(state, resolveStateCalculatorId(state));
  const settableFields = getSettableControlFields(profile);
  return {
    selectedControlField: normalizeSelectedControlField(profile, state.ui.selectedControlField, state.ui.memoryVariable),
    settableFields,
  };
};
