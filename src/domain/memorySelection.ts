import type { ControlField, ControlProfile, MemoryVariable } from "./types.js";

export const MEMORY_VARIABLE_ORDER: readonly MemoryVariable[] = ["\u03B1", "\u03B2", "\u03B3", "\u03B4", "\u03B5"];

export const memoryVariableToControlField = (memoryVariable: MemoryVariable): ControlField => {
  if (memoryVariable === "\u03B1") {
    return "alpha";
  }
  if (memoryVariable === "\u03B2") {
    return "beta";
  }
  if (memoryVariable === "\u03B3") {
    return "gamma";
  }
  if (memoryVariable === "\u03B4") {
    return "delta";
  }
  return "epsilon";
};

export const controlFieldToMemoryVariable = (field: ControlField): MemoryVariable => {
  if (field === "alpha") {
    return "\u03B1";
  }
  if (field === "beta") {
    return "\u03B2";
  }
  if (field === "gamma") {
    return "\u03B3";
  }
  if (field === "delta") {
    return "\u03B4";
  }
  return "\u03B5";
};

export const settableMemoryVariablesForProfile = (profile: ControlProfile): MemoryVariable[] =>
  MEMORY_VARIABLE_ORDER.filter((memoryVariable) => profile.settable[memoryVariableToControlField(memoryVariable)]);

export const normalizeMemoryVariableSelection = (
  selected: MemoryVariable | null | undefined,
  profile: ControlProfile,
): MemoryVariable | null => {
  const settableVariables = settableMemoryVariablesForProfile(profile);
  if (settableVariables.length === 0) {
    return null;
  }
  if (selected && settableVariables.includes(selected)) {
    return selected;
  }
  return settableVariables[0];
};
