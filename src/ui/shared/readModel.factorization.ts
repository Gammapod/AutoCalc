import { buildRollDiagnosticsSnapshot, type OrbitHeuristicState, type RollDiagnosticsSnapshot } from "../../domain/diagnostics.js";
import type { LocalGrowthOrder } from "../../domain/rollGrowthOrder.js";
import type { GameState } from "../../domain/types.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";

export type { LocalGrowthOrder, OrbitHeuristicState, RollDiagnosticsSnapshot };

export type FactorizationPanelViewModel = {
  snapshot: RollDiagnosticsSnapshot;
  rows: FactorizationPanelRowViewModel[];
};

export type FactorizationPanelRowViewModel = {
  text: string;
  kind: "section" | "normal" | "placeholder";
  role: string | null;
  uxRole: UxRole;
  uxState: UxRoleState;
  uxRoleOverride?: UxRole;
  overrideReason?: string;
};

const resolveFactorizationRowUx = (
  row: RollDiagnosticsSnapshot["sectionRows"][number],
  hasLatestRollError: boolean,
): { uxRole: UxRole; uxState: UxRoleState } => {
  if (row.role === "current_factorization" && hasLatestRollError) {
    return { uxRole: "error", uxState: "active" };
  }
  if (row.role === "cycle_transient" || row.role === "cycle_period") {
    return { uxRole: "analysis", uxState: "active" };
  }
  if (row.kind === "placeholder") {
    return { uxRole: "help", uxState: "placeholder" };
  }
  if (row.kind === "section") {
    return { uxRole: "help", uxState: "active" };
  }
  return { uxRole: "default", uxState: "normal" };
};

export const resolveFactorizationRowUxAssignment = (row: FactorizationPanelRowViewModel): UxRoleAssignment => ({
  uxRole: row.uxRole,
  uxState: row.uxState,
  ...(row.uxRoleOverride ? { uxRoleOverride: row.uxRoleOverride } : {}),
  ...(row.overrideReason ? { overrideReason: row.overrideReason } : {}),
});

export const buildFactorizationPanelViewModel = (state: GameState): FactorizationPanelViewModel => {
  const snapshot = buildRollDiagnosticsSnapshot(state);
  const hasLatestRollError = Boolean(state.calculator.rollEntries.at(-1)?.error);
  const rows = snapshot.sectionRows.map((row): FactorizationPanelRowViewModel => {
    const ux = resolveFactorizationRowUx(row, hasLatestRollError);
    return {
      text: row.text,
      kind: row.kind,
      role: row.role ?? null,
      uxRole: ux.uxRole,
      uxState: ux.uxState,
    };
  });
  return {
    snapshot,
    rows,
  };
};
