import { getButtonDefinition, type ButtonBehaviorKind, type ButtonHandlerOverrideId } from "./buttonRegistry.js";
import { buttonRegistry } from "./buttonRegistry.js";
import { resolveKeyId, type KeyId } from "./keyPresentation.js";

export type KeyActionHandlerId =
  | "apply_digit"
  | "apply_operator"
  | "apply_unary_operator"
  | "apply_execute"
  | "apply_utility"
  | "apply_visualizer_noop"
  | "apply_toggle_noop"
  | "apply_noop"
  | "apply_memory"
  | "apply_clear_all"
  | "apply_backspace"
  | "apply_undo"
  | "apply_equals"
  | "apply_step_through"
  | "apply_roll_inverse";

const behaviorHandlerByKind: Record<ButtonBehaviorKind, KeyActionHandlerId> = {
  digit: "apply_digit",
  operator: "apply_operator",
  unary_operator: "apply_unary_operator",
  execute: "apply_execute",
  utility: "apply_utility",
  visualizer: "apply_visualizer_noop",
  toggle: "apply_toggle_noop",
  noop: "apply_noop",
};

const overrideHandlerById: Record<ButtonHandlerOverrideId, KeyActionHandlerId> = {
  utility_clear_all: "apply_clear_all",
  utility_backspace: "apply_backspace",
  utility_undo: "apply_undo",
  system_save_quit_main_menu: "apply_noop",
  system_quit_game: "apply_noop",
  system_switch_mode_game: "apply_noop",
  system_new_game: "apply_noop",
  system_switch_mode_sandbox: "apply_noop",
  memory_cycle_variable: "apply_memory",
  memory_recall_into_input: "apply_memory",
  memory_adjust_plus: "apply_memory",
  memory_adjust_minus: "apply_memory",
  execute_equals: "apply_equals",
  execute_play_pause: "apply_toggle_noop",
  execute_step_through: "apply_step_through",
  execute_roll_inverse: "apply_roll_inverse",
  unary_operator_commit_slot: "apply_unary_operator",
};

export const resolveKeyActionHandlerId = (key: KeyId): KeyActionHandlerId => {
  const definition = getButtonDefinition(resolveKeyId(key));
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
