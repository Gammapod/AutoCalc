import assert from "node:assert/strict";
import { formatKeyCellLabel, formatKeyLabel } from "../src/ui/render.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, KeyCell } from "../src/domain/types.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel("*"), "\u00D7", "mul key label renders as \u00D7");
  assert.equal(formatKeyLabel("/"), "\u00F7", "div key label renders as \u00F7");
  assert.equal(formatKeyLabel("#"), "#/⟡", "euclidean division key label renders as #/⟡");
  assert.equal(formatKeyLabel("⟡"), "⟡", "modulo key label renders as ⟡");
  assert.equal(formatKeyLabel("\u23EF"), "⏵︎", "play/pause key defaults to play icon");
  assert.equal(formatKeyLabel("+"), "+", "plus key label remains +");
  assert.equal(formatKeyLabel("NEG"), "-\u{1D465}", "NEG key label uses stylized indicator");

  const base = initialState();
  const pauseToggleCell: KeyCell = {
    kind: "key",
    key: "\u23EF",
    behavior: { type: "toggle_flag", flag: "execution.pause" },
  };
  assert.equal(formatKeyCellLabel(base, pauseToggleCell), "⏵︎", "untoggled play/pause key renders play icon");

  const toggled: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        "execution.pause": true,
      },
    },
  };
  assert.equal(formatKeyCellLabel(toggled, pauseToggleCell), "⏸︎", "toggled play/pause key renders pause icon");
};

