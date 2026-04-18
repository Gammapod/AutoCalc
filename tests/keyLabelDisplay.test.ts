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
  assert.equal(formatKeyLabel(k("op_euclid_tuple")), "\u2AFD \u254E \u25C7\u2192M", "euclidean tuple key label renders as \u2AFD \u254E \u25C7\u2192M");
  assert.equal(formatKeyLabel(k("op_eulog")), "\u2225", "eulog key label renders as \u2225");
  assert.equal(formatKeyLabel(k("op_residual")), "\u{1F79B}", "residual key label renders as \u{1F79B}");
  assert.equal(formatKeyLabel(k("op_log_tuple")), "\u2225 \u254E \u{1F79B}\u2192M", "log tuple key label renders as \u2225 \u254E \u{1F79B}\u2192M");
  assert.equal(formatKeyLabel(k("op_whole_steps")), "\u2669\u2191", "whole-steps key label renders as \u2669\u2191");
  assert.equal(formatKeyLabel(k("op_interval")), "\u22EE", "interval key label renders as \u22EE");
  assert.equal(formatKeyLabel(k("op_mod")), "\u27E1", "modulo key label renders as \u27E1");
  assert.equal(formatKeyLabel(k("unary_reciprocal")), "\u00B9\u2044\u2099", "reciprocal key label renders as \u00B9\u2044\u2099");
  assert.equal(formatKeyLabel(k("unary_plus_i")), "M++", "plus-i key label renders as M++");
  assert.equal(formatKeyLabel(k("unary_minus_i")), "M\u2013\u2013", "minus-i key label renders as M\u2013\u2013");
  assert.equal(formatKeyLabel(k("unary_conjugate")), "M\u00B1", "conjugate key label renders as M\u00B1");
  assert.equal(formatKeyLabel(k("unary_real_flip")), "R\u00B1", "real-flip key label renders as R\u00B1");
  assert.equal(formatKeyLabel(k("unary_imaginary_part")), "C/M\u2192", "imaginary-part key label renders as C/M\u2192");
  assert.equal(formatKeyLabel(k("unary_real_part")), "MC", "real-part key label renders as MC");
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
  assert.equal(formatKeyLabel(k("viz_state")), "STATE", "STATE key label remains STATE");
  assert.equal(formatKeyLabel(k("toggle_binary_mode")), "b\u2082", "binary-mode settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_history")), "History", "history settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_delta_range_clamp")), "[\u2013, +)", "delta-range settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_mod_zero_to_delta")), "[0, +)", "mod-range settings key label renders canonical face");
  assert.equal(formatKeyLabel(k("toggle_binary_octave_cycle")), "\u{1D106}", "octave-cycle settings key label renders canonical face");
  assert.equal(formatKeyLabel(KEY_ID.viz_factorization), "\u2315", "factorization visualizer key label renders canonical face");
  assert.equal(formatKeyLabel(k("viz_number_line")), "\u25FB", "number-line visualizer key label renders canonical face");
  assert.equal(formatKeyLabel(k("viz_circle")), "\u25EF", "circle visualizer key label renders canonical face");
  assert.equal(formatKeyLabel(k("viz_ratios")), "RATIO", "ratios visualizer key label renders canonical face");

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


