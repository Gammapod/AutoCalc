import { initialState } from "../domain/state.js";
import type { Action, GameState } from "../domain/types.js";
import { executeCommand } from "../domain/commands.js";

export const reduceActionWithV2 = (state: GameState | undefined, action: Action): GameState =>
  executeCommand(state ?? initialState(), { type: "DispatchAction", action }).state;
