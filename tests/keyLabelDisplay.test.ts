import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { formatKeyCellLabel } from "../src/ui/modules/calculatorStorageCore.js";
import { formatKeyLabel } from "../src/ui/shared/readModel.js";
import { AUTO_EQUALS_FLAG, initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { k } from "./support/keyCompat.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel(k("*")), "\u00D7", "mul key label renders as \u00D7");
  assert.equal(formatKeyLabel(k("/")), "\u00F7", "div key label renders as \u00F7");
  assert.equal(formatKeyLabel(k("#")), "\u2AFD", "euclidean division key label renders as \u2AFD");
  assert.equal(formatKeyLabel(k("\u27E1")), "\u27E1", "modulo key label renders as \u27E1");
  assert.equal(formatKeyLabel(k("UNDO")), "\u2936", "undo key label renders as \u2936");
  assert.equal(formatKeyLabel(k("\u2190")), "\u2190", "backspace key label remains left arrow");
  assert.equal(formatKeyLabel(k("+")), "+", "plus key label remains +");
  assert.equal(formatKeyLabel(k("=")), "=", "equals key label remains =");
  assert.equal(formatKeyLabel(k("1")), "1", "digit label remains literal");
  assert.equal(formatKeyLabel(k("FEED")), "FEED", "FEED key label remains FEED");
  assert.equal(formatKeyLabel(k("\u27E1[0, \u{1D6FF})")), "\u27E1[0, \u{1D6FF})", "mod-range settings key label renders canonical face");
  assert.equal(formatKeyLabel(KEY_ID.viz_factorization), "𝚷𝑝ᵉ", "factorization visualizer key label renders superscript e");
  assert.equal(formatKeyLabel(k("CIRCLE")), "\u25EF", "CIRCLE key label renders as open circle");

  const base = initialState();
  const equalsCell = { kind: "key", key: k("=") } as const;
  assert.equal(formatKeyCellLabel(base, equalsCell), "=", "cell label delegates to key label rendering");

  const autoEqualsToggleCell = { kind: "key", key: k("="), behavior: { type: "toggle_flag" as const, flag: AUTO_EQUALS_FLAG } } as const;
  assert.equal(formatKeyCellLabel(base, autoEqualsToggleCell), "\u25B6", "auto-equals toggle key renders play icon while off");
  const withAutoOn = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [AUTO_EQUALS_FLAG]: true,
      },
    },
  };
  assert.equal(formatKeyCellLabel(withAutoOn, autoEqualsToggleCell), "\u275A\u275A", "auto-equals toggle key renders pause icon while on");
};

