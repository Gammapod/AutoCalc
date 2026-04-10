import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { formatKeyCellLabel } from "../src/ui/modules/calculatorStorageCore.js";
import { formatKeyLabel } from "../src/ui/shared/readModel.js";
import { EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { k } from "./support/keyCompat.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel(k("op_mul")), "\u00D7", "mul key label renders as \u00D7");
  assert.equal(formatKeyLabel(k("op_div")), "\u00F7", "div key label renders as \u00F7");
  assert.equal(formatKeyLabel(k("op_euclid_div")), "\u2AFD", "euclidean division key label renders as \u2AFD");
  assert.equal(formatKeyLabel(k("op_mod")), "\u27E1", "modulo key label renders as \u27E1");
  assert.equal(formatKeyLabel(k("op_rotate_15")), "\u21B6 \u299C/6^n", "binary 15-degree rotation key label renders canonical face");
  assert.equal(formatKeyLabel(k("util_undo")), "\u21A9", "undo key label renders as \u21A9");
  assert.equal(formatKeyLabel(k("util_backspace")), "\u2190", "backspace key label remains left arrow");
  assert.equal(formatKeyLabel(k("system_save_quit_main_menu")), "\uD83D\uDDAB\u27A0\u26ED", "Save&Quit key label renders canonical face");
  assert.equal(formatKeyLabel(k("system_quit_game")), "Quit Game", "Quit Game key label renders canonical face");
  assert.equal(formatKeyLabel(k("op_add")), "+", "plus key label remains +");
  assert.equal(formatKeyLabel(k("exec_equals")), "=", "equals key label remains =");
  assert.equal(formatKeyLabel(k("digit_1")), "1", "digit label remains literal");
  assert.equal(formatKeyLabel(k("viz_feed")), "FEED", "FEED key label remains FEED");
  assert.equal(formatKeyLabel(k("viz_title")), "TITLE", "TITLE key label remains TITLE");
  assert.equal(formatKeyLabel(k("viz_release_notes")), "NOTES", "NOTES key label remains NOTES");
  assert.equal(formatKeyLabel(k("viz_help")), "HELP", "HELP key label remains HELP");
  assert.equal(formatKeyLabel(k("toggle_binary_mode")), "b\u2082", "binary-mode settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_history")), "History", "history settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_mod_zero_to_delta")), "\u27E1[0, \u{1D6FF})", "mod-range settings key label renders canonical face");
  assert.equal(formatKeyLabel(KEY_ID.viz_factorization), "\u2315", "factorization visualizer key label renders canonical face");
  assert.equal(formatKeyLabel(k("viz_number_line")), "\u25FB", "number-line visualizer key label renders canonical face");
  assert.equal(formatKeyLabel(k("viz_circle")), "\u25EF", "circle visualizer key label renders canonical face");

  const base = initialState();
  const equalsCell = { kind: "key", key: k("exec_equals") } as const;
  assert.equal(formatKeyCellLabel(base, equalsCell), "=", "cell label delegates to key label rendering");

  const playPauseToggleCell = { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag" as const, flag: EXECUTION_PAUSE_FLAG } } as const;
  assert.equal(formatKeyCellLabel(base, playPauseToggleCell), "\u25B6", "play/pause toggle renders play icon while off");
  const withAutoOn = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
      },
    },
  };
  assert.equal(formatKeyCellLabel(withAutoOn, playPauseToggleCell), "\u275A\u275A", "play/pause toggle renders pause icon while on");
};


