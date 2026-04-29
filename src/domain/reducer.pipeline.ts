import { buttonRegistry } from "./buttonRegistry.js";
import { normalizeRuntimeStateInvariants } from "./runtimeStateInvariants.js";
import { reduceWithProjectionScope, type ReducerOptions } from "./reducer.pipeline.scope.js";
import { withRecordedDiagnosticsAction } from "./reducer.pipeline.diagnostics.js";
import type { Action, GameState, Key, VisualizerId } from "./types.js";

const visualizerKeyById = new Map<VisualizerId, Key>(
  buttonRegistry
    .filter((entry): entry is typeof buttonRegistry[number] & { visualizerId: VisualizerId } =>
      entry.behaviorKind === "visualizer" && typeof entry.visualizerId === "string")
    .map((entry) => [entry.visualizerId, entry.key]),
);

export type { ReducerOptions } from "./reducer.pipeline.scope.js";
export { resolveActionCalculatorId, resolveExecutionPolicyForAction } from "./reducer.pipeline.action.js";
export type { ResolvedExecutionPolicy } from "./reducer.pipeline.action.js";

export const reduceThroughReducerPipeline = (
  state: GameState,
  action: Action,
  options: ReducerOptions = {},
): GameState => {
  const scoped = reduceWithProjectionScope(state, action, options);
  const withDiagnostics = withRecordedDiagnosticsAction(state, scoped, action, visualizerKeyById);
  return normalizeRuntimeStateInvariants(withDiagnostics);
};
