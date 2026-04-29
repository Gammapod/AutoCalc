import { initialState } from "./state.js";
import { reduceThroughReducerPipeline, type ReducerOptions } from "./reducer.pipeline.js";
import type { Action, GameState } from "./types.js";

export { resolveActionCalculatorId, resolveExecutionPolicyForAction } from "./reducer.pipeline.js";
export type { ResolvedExecutionPolicy } from "./reducer.pipeline.js";

export const reducer = (state: GameState = initialState(), action: Action, options: ReducerOptions = {}): GameState => {
  return reduceThroughReducerPipeline(state, action, options);
};
