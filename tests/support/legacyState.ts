import { initialState } from "../../src/domain/state.js";
import type { GameState } from "../../src/domain/types.js";

export const legacyInitialState = (): GameState => initialState();

