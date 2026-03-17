import { initialState } from "./state.js";
import { reducer } from "./reducer.js";
import { actionFromEvent, type DomainEvent } from "./events.js";
import type { GameState } from "./types.js";
import type { AppServices } from "../contracts/appServices.js";

type ApplyEventOptions = {
  services?: AppServices;
};

export const applyEvent = (state: GameState | undefined, event: DomainEvent, options: ApplyEventOptions = {}): GameState =>
  reducer(state ?? initialState(), actionFromEvent(event), { services: options.services });
