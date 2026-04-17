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
    shortTemplate: "{keyFace}: run inverse execution for the current function.",
    longTemplate: "{keyFace} enters inverse auto-step execution; supported inverse stages include arithmetic pairs, ^ as canonical-root inversion (x^0 ambiguous), and ×i as divide-by-i, with ambiguous paths resolving to NaN.",
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
  viz_state: {
    title: "State Visualizer",
    shortTemplate: "{keyFace}: show internal calculator settings panel.",
    longTemplate: "{keyFace} toggles internal state visualizer mode for the active calculator instance.",
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
  viz_release_notes: {
    title: "Release Notes Visualizer",
    shortTemplate: "{keyFace}: toggle current-version release notes panel.",
    longTemplate: "{keyFace} toggles release notes visualizer mode and shows notes for the current app version.",
  },
  viz_help: {
    title: "Help Visualizer",
    shortTemplate: "{keyFace}: show diagnostics and release notes help.",
    longTemplate: "{keyFace} toggles the HELP visualizer focused on Last Key, Next Operation, and latest release notes.",
  },
  viz_number_line: {
    title: "Number Line Visualizer",
    shortTemplate: "{keyFace}: toggle number line panel.",
    longTemplate: "{keyFace} toggles number line visualizer mode.",
  },
  viz_circle: {
    title: "Circle Visualizer",
    shortTemplate: "{keyFace}: toggle circle panel.",
    longTemplate: "{keyFace} toggles circle visualizer mode.",
  },
  viz_ratios: {
    title: "Ratios Visualizer",
    shortTemplate: "{keyFace}: toggle ratios panel.",
    longTemplate: "{keyFace} toggles ratios visualizer mode.",
  },
  viz_algebraic: {
    title: "Algebraic Visualizer",
    shortTemplate: "{keyFace}: toggle algebraic panel.",
    longTemplate: "{keyFace} toggles algebraic visualizer mode.",
  },
};

export const keyDiagnostics: Record<KeyId, KeyDiagnosticEntry> = {
  ...defaultEntries,
  ...overrideEntries,
};
