import { getButtonDefinition, type ButtonBehaviorKind, type ButtonHandlerOverrideId, type ButtonKey } from "./buttonRegistry.js";
import { buttonRegistry } from "./buttonRegistry.js";

export type KeyActionHandlerId =
  | "apply_digit"
  | "apply_operator"
  | "apply_execute"
  | "apply_utility"
  | "apply_visualizer_noop"
  | "apply_toggle_noop"
  | "apply_noop"
  | "apply_memory"
  | "apply_negate"
  | "apply_clear_all"
  | "apply_clear_entry"
  | "apply_backspace"
  | "apply_undo"
  | "apply_equals"
  | "apply_increment"
  | "apply_decrement";

const behaviorHandlerByKind: Record<ButtonBehaviorKind, KeyActionHandlerId> = {
  digit: "apply_digit",
  operator: "apply_operator",
  execute: "apply_execute",
  utility: "apply_utility",
  visualizer: "apply_visualizer_noop",
  toggle: "apply_toggle_noop",
  noop: "apply_noop",
};

const overrideHandlerById: Record<ButtonHandlerOverrideId, KeyActionHandlerId> = {
  negate_total_or_drafting: "apply_negate",
  utility_clear_all: "apply_clear_all",
  utility_clear_entry: "apply_clear_entry",
  utility_backspace: "apply_backspace",
  utility_undo: "apply_undo",
  memory_cycle_variable: "apply_memory",
  memory_recall_into_input: "apply_memory",
  memory_adjust_plus: "apply_memory",
  memory_adjust_minus: "apply_memory",
  execute_equals: "apply_equals",
  execute_increment: "apply_increment",
  execute_decrement: "apply_decrement",
};

export const resolveKeyActionHandlerId = (key: ButtonKey): KeyActionHandlerId => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return "apply_noop";
  }
  if ("handlerOverrideId" in definition && definition.handlerOverrideId) {
    return overrideHandlerById[definition.handlerOverrideId];
  }
  return behaviorHandlerByKind[definition.behaviorKind];
};

export const listBehaviorHandlerIds = (): Readonly<Record<ButtonBehaviorKind, KeyActionHandlerId>> => behaviorHandlerByKind;

export const validateKeyCatalogHandlerCoherence = (): string[] => {
  const issues: string[] = [];
  for (const entry of buttonRegistry) {
    const overrideId = "handlerOverrideId" in entry ? entry.handlerOverrideId : undefined;
    if (overrideId && !overrideHandlerById[overrideId]) {
      issues.push(`missing override handler mapping for ${entry.key} (${overrideId})`);
    }
    if (!overrideId && !behaviorHandlerByKind[entry.behaviorKind]) {
      issues.push(`missing behavior handler mapping for ${entry.key} (${entry.behaviorKind})`);
    }
  }
  return issues;
};
