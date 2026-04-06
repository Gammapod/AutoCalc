import { buildRollDiagnosticsSnapshot } from "../../domain/diagnostics.js";
import type { GameState } from "../../domain/types.js";
import { getAppServices } from "../../contracts/appServices.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";

export type HelpRowKind = "section" | "normal" | "placeholder";

export type HelpRowViewModel = {
  text: string;
  kind: HelpRowKind;
  uxRole: UxRole;
  uxState: UxRoleState;
  uxRoleOverride?: UxRole;
  overrideReason?: string;
};

export type HelpPanelViewModel = {
  rows: HelpRowViewModel[];
};

const toAssignment = (row: HelpRowViewModel): UxRoleAssignment => ({
  uxRole: row.uxRole,
  uxState: row.uxState,
  ...(row.uxRoleOverride ? { uxRoleOverride: row.uxRoleOverride } : {}),
  ...(row.overrideReason ? { overrideReason: row.overrideReason } : {}),
});

export const resolveHelpRowUxAssignment = (row: HelpRowViewModel): UxRoleAssignment => toAssignment(row);

export const buildHelpPanelViewModel = (state: GameState): HelpPanelViewModel => {
  const snapshot = buildRollDiagnosticsSnapshot(state);
  const latestReleaseNote = getAppServices().contentProvider.releaseNotes.entries[0] ?? null;
  const rows: HelpRowViewModel[] = [
    { text: "Last Key", kind: "section", uxRole: "help", uxState: "active" },
    { text: `${snapshot.lastKey.title}: ${snapshot.lastKey.short}`, kind: "normal", uxRole: "help", uxState: "normal" },
    { text: snapshot.lastKey.long, kind: "normal", uxRole: "help", uxState: "normal" },
    ...snapshot.lastKey.caveats.map((line) => ({
      text: line,
      kind: "placeholder" as const,
      uxRole: "help" as const,
      uxState: "placeholder" as const,
    })),
    { text: "Next Operation", kind: "section", uxRole: "help", uxState: "active" },
    {
      text: snapshot.nextOperation.expandedShort,
      kind: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder",
      uxRole: "help",
      uxState: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder",
    },
    {
      text: snapshot.nextOperation.expandedLong,
      kind: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder",
      uxRole: "help",
      uxState: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder",
    },
    { text: "Release Notes", kind: "section", uxRole: "help", uxState: "active" },
    ...(latestReleaseNote
      ? [
        {
          text: `${latestReleaseNote.releaseVersion} (${latestReleaseNote.channel}): ${latestReleaseNote.title}`,
          kind: "normal" as const,
          uxRole: "help" as const,
          uxState: "normal" as const,
        },
        {
          text: latestReleaseNote.summary,
          kind: "normal" as const,
          uxRole: "help" as const,
          uxState: "normal" as const,
        },
      ]
      : [{
        text: "No release notes configured.",
        kind: "placeholder" as const,
        uxRole: "help" as const,
        uxState: "placeholder" as const,
      }]),
  ];

  return { rows };
};

