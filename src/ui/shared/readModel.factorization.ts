import { buildRollDiagnosticsSnapshot, type OrbitHeuristicState, type RollDiagnosticsSnapshot } from "../../domain/diagnostics.js";
import type { LocalGrowthOrder } from "../../domain/rollGrowthOrder.js";
import type { GameState } from "../../domain/types.js";

export type { LocalGrowthOrder, OrbitHeuristicState, RollDiagnosticsSnapshot };

export type FactorizationPanelViewModel = {
  snapshot: RollDiagnosticsSnapshot;
};

export const buildFactorizationPanelViewModel = (state: GameState): FactorizationPanelViewModel => ({
  snapshot: buildRollDiagnosticsSnapshot(state),
});
