import { initialState } from "./state.js";
import { reducer } from "./reducer.js";
import { actionFromEvent, type DomainEvent } from "./events.js";
import type { GameState } from "./types.js";

export const applyEvent = (state: GameState | undefined, event: DomainEvent): GameState =>
  reducer(state ?? initialState(), actionFromEvent(event));
