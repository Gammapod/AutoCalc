import { initialState } from "./state.js";
import { normalizeRuntimeStateInvariants } from "./runtimeStateInvariants.js";
import { buttonRegistry } from "./buttonRegistry.js";
import { reduceWithProjectionScope, type ReducerOptions } from "./reducer.pipeline.scope.js";
import { withRecordedDiagnosticsAction } from "./reducer.pipeline.diagnostics.js";
import type {
  Action,
  GameState,
  Key,
  VisualizerId,
} from "./types.js";

const visualizerKeyById = new Map<VisualizerId, Key>(
  buttonRegistry
    .filter((entry): entry is typeof buttonRegistry[number] & { visualizerId: VisualizerId } =>
      entry.behaviorKind === "visualizer" && typeof entry.visualizerId === "string")
    .map((entry) => [entry.visualizerId, entry.key]),
);

export { resolveActionCalculatorId, resolveExecutionPolicyForAction } from "./reducer.pipeline.action.js";
export type { ResolvedExecutionPolicy } from "./reducer.pipeline.action.js";

export const reducer = (state: GameState = initialState(), action: Action, options: ReducerOptions = {}): GameState => {
  const nextState = reduceWithProjectionScope(state, action, options);
  const withTrace = withRecordedDiagnosticsAction(state, nextState, action, visualizerKeyById);
  return normalizeRuntimeStateInvariants(withTrace);
};
