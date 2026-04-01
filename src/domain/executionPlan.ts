import type { GameState, Slot } from "./types.js";
import {
  resolveExecutionPlanIRWrapStageMode,
  type ExecutionPlanStage,
  type WrapStageMode,
} from "./executionPlanIR.js";

export type ExecutionStage = ExecutionPlanStage;

export const resolveWrapStageMode = (state: Pick<GameState, "settings">): WrapStageMode | null => {
  return resolveExecutionPlanIRWrapStageMode(state);
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
