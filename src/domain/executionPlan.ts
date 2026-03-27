import type { GameState, Slot } from "./types.js";

export type WrapStageMode = "delta_range_clamp" | "mod_zero_to_delta";

export type ExecutionStage =
  | { kind: "slot"; slot: Slot }
  | { kind: "wrap"; mode: WrapStageMode };

export const resolveWrapStageMode = (state: Pick<GameState, "settings">): WrapStageMode | null => {
  if (state.settings.wrapper === "mod_zero_to_delta") {
    return "mod_zero_to_delta";
  }
  if (state.settings.wrapper === "delta_range_clamp") {
    return "delta_range_clamp";
  }
  return null;
};

export const buildExecutionStagePlan = (
  operationSlots: Slot[],
  state: Pick<GameState, "settings">,
): ExecutionStage[] => {
  const stages: ExecutionStage[] = operationSlots.map((slot) => ({ kind: "slot", slot }));
  const wrapStage = resolveWrapStageMode(state);
  if (wrapStage) {
    stages.push({ kind: "wrap", mode: wrapStage });
  }
  return stages;
};

export const getExecutionStageCount = (
  operationSlots: Slot[],
  state: Pick<GameState, "settings">,
): number => buildExecutionStagePlan(operationSlots, state).length;
