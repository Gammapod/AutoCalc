import type { GameState } from "../../domain/types.js";
import { cloneWithBigIntReviver } from "./saveEnvelope.js";

export const serializeV20 = (state: GameState): unknown => ({
  ...state,
  // Debug edits are explicitly session-only.
  sessionControlProfiles: {},
});

export const deserializeV20 = (payloadState: unknown): GameState => {
  try {
    return cloneWithBigIntReviver(payloadState) as GameState;
  } catch {
    throw new Error("Failed to deserialize persisted state.");
  }
};
