import assert from "node:assert/strict";
import { formatKeyCellLabel } from "../src/ui/modules/calculatorStorageCore.js";
import { formatKeyLabel } from "../src/ui/shared/readModel.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, KeyCell } from "../src/domain/types.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel("*"), "\u00D7", "mul key label renders as \u00D7");
  assert.equal(formatKeyLabel("/"), "\u00F7", "div key label renders as \u00F7");
  assert.equal(formatKeyLabel("#"), "#/\u27E1", "euclidean division key label renders as #/\u27E1");
  assert.equal(formatKeyLabel("\u27E1"), "\u27E1", "modulo key label renders as \u27E1");
  assert.equal(formatKeyLabel("UNDO"), "\u2936", "undo key label renders as \u2936");
  assert.equal(formatKeyLabel("\u2190"), "\u2190", "backspace key label remains left arrow");
  assert.equal(formatKeyLabel("\u23EF"), "\u25BA", "play/pause key defaults to play icon");
  assert.equal(formatKeyLabel("+"), "+", "plus key label remains +");
  assert.equal(formatKeyLabel("="), "=", "equals key label remains =");
  assert.equal(formatKeyLabel("1"), "1", "digit label remains literal");
  assert.equal(formatKeyLabel("FEED"), "FEED", "FEED key label remains FEED");
  assert.equal(formatKeyLabel("𝚷𝑝^𝑒"), "𝚷𝑝ᵉ", "factorization visualizer key label renders superscript e");
  assert.equal(formatKeyLabel("CIRCLE"), "\u25EF", "CIRCLE key label renders as open circle");

  const base = initialState();
  const pauseToggleCell: KeyCell = {
    kind: "key",
    key: "\u23EF",
    behavior: { type: "toggle_flag", flag: "execution.pause" },
  };
  assert.equal(formatKeyCellLabel(base, pauseToggleCell), "\u25BA", "untoggled play/pause key renders play icon");

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
  assert.equal(formatKeyCellLabel(toggled, pauseToggleCell), "\u275A\u275A", "toggled play/pause key renders pause icon");
};
