import { DELTA_RANGE_CLAMP_FLAG, MOD_ZERO_TO_DELTA_FLAG } from "./state.js";
import type { GameState, Slot } from "./types.js";

export type WrapStageMode = "delta_range_clamp" | "mod_zero_to_delta";

export type ExecutionStage =
  | { kind: "slot"; slot: Slot }
  | { kind: "wrap"; mode: WrapStageMode };

export const resolveWrapStageMode = (state: Pick<GameState, "ui">): WrapStageMode | null => {
  const deltaRangeWrapEnabled = Boolean(state.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG]);
  const modZeroToDeltaEnabled = Boolean(state.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG]);
  if (modZeroToDeltaEnabled) {
    return "mod_zero_to_delta";
  }
  if (deltaRangeWrapEnabled) {
    return "delta_range_clamp";
  }
  return null;
};

export const buildExecutionStagePlan = (
  operationSlots: Slot[],
  state: Pick<GameState, "ui">,
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
  state: Pick<GameState, "ui">,
): number => buildExecutionStagePlan(operationSlots, state).length;
