import type { KeyId } from "../../domain/keyPresentation.js";
import { getButtonFace, keyPresentationCatalog, resolveKeyId } from "../../domain/keyPresentation.js";
import type { KeyDiagnosticEntry } from "../../contracts/diagnostics.js";

const buildDefaultKeyEntry = (keyId: KeyId): KeyDiagnosticEntry => ({
  title: `Key ${getButtonFace(keyId)}`,
  shortTemplate: "{keyFace}: {actionKind}.",
  longTemplate: "{keyFace} on {calcSymbol} is active while {activeVisualizer} visualizer is selected.",
});

const defaultEntries: Record<KeyId, KeyDiagnosticEntry> = Object.fromEntries(
  keyPresentationCatalog.map((entry) => [resolveKeyId(entry.keyId), buildDefaultKeyEntry(entry.keyId)]),
) as Record<KeyId, KeyDiagnosticEntry>;

const overrideEntries: Partial<Record<KeyId, KeyDiagnosticEntry>> = {
  util_clear_all: {
    title: "Clear All",
    shortTemplate: "{keyFace}: reset calculator state and clear drafting.",
    longTemplate: "{keyFace} resets total, roll, step progress, and pending draft for {calcSymbol}.",
  },
  util_backspace: {
    title: "Backspace",
    shortTemplate: "{keyFace}: remove the latest editable input token.",
    longTemplate: "{keyFace} edits drafting input when possible; if nothing is editable it becomes a no-op.",
  },
  util_undo: {
    title: "Undo",
    shortTemplate: "{keyFace}: request inverse rollback when available.",
    longTemplate: "{keyFace} attempts roll inverse behavior and may no-op when rollback is not legal.",
  },
  exec_step_through: {
    title: "Step Through",
    shortTemplate: "{keyFace}: execute one pending operation step.",
    longTemplate: "{keyFace} advances one operation slot using the current step context.",
  },
  exec_roll_inverse: {
    title: "Roll Inverse",
    shortTemplate: "{keyFace}: run predecessor-style inverse execution.",
    longTemplate: "{keyFace} appends an inverse-origin row when reversal is valid.",
  },
  exec_equals: {
    title: "Equals Toggle",
    shortTemplate: "{keyFace}: toggle equals-driven execution mode.",
    longTemplate: "{keyFace} toggles the equals execution flag rather than dispatching a direct PRESS_KEY path.",
  },
  viz_factorization: {
    title: "Factorization Visualizer",
    shortTemplate: "{keyFace}: toggle factorization diagnostics panel.",
    longTemplate: "{keyFace} changes active visualizer to factorization or back to total.",
    caveats: ["When visualizer keys are pressed, Last Key reflects visualizer toggle behavior."],
  },
  viz_graph: {
    title: "Graph Visualizer",
    shortTemplate: "{keyFace}: toggle graph panel visibility.",
    longTemplate: "{keyFace} toggles the graph visualizer without mutating calculator arithmetic state.",
  },
  viz_feed: {
    title: "Feed Visualizer",
    shortTemplate: "{keyFace}: toggle feed diagnostics panel.",
    longTemplate: "{keyFace} toggles feed display while preserving core calculator state.",
  },
  viz_title: {
    title: "Title Visualizer",
    shortTemplate: "{keyFace}: toggle title panel.",
    longTemplate: "{keyFace} toggles title visualizer mode.",
  },
  viz_help: {
    title: "Help Visualizer",
    shortTemplate: "{keyFace}: show last-key and next-operation help.",
    longTemplate: "{keyFace} toggles the HELP visualizer focused on Last Key and Next Operation diagnostics.",
  },
  viz_circle: {
    title: "Circle Visualizer",
    shortTemplate: "{keyFace}: toggle orbit circle panel.",
    longTemplate: "{keyFace} toggles circle visualizer mode.",
  },
  viz_algebraic: {
    title: "Algebraic Visualizer",
    shortTemplate: "{keyFace}: toggle algebraic panel.",
    longTemplate: "{keyFace} toggles algebraic visualizer mode.",
  },
  viz_eigen_allocator: {
    title: "Allocator Visualizer",
    shortTemplate: "{keyFace}: toggle allocator diagnostics panel.",
    longTemplate: "{keyFace} toggles allocator visualizer mode.",
  },
};

export const keyDiagnostics: Record<KeyId, KeyDiagnosticEntry> = {
  ...defaultEntries,
  ...overrideEntries,
};
