import assert from "node:assert/strict";
import { toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import { calculatorSeedManifest, createSeededKeyLayout } from "../src/domain/calculatorSeedManifest.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { initialState } from "../src/domain/state.js";
import type { CalculatorId } from "../src/domain/types.js";
import { k } from "./support/keyCompat.js";

const keyAt = (layout: ReturnType<typeof createSeededKeyLayout>["keyLayout"], columns: number, rows: number, row: number, col: number): string | null => {
  const index = toIndexFromCoord({ row, col }, columns, rows);
  const cell = layout[index];
  return cell?.kind === "key" ? cell.key : null;
};

export const runCalculatorSeedManifestTests = (): void => {
  const menuA = createSeededKeyLayout("menu");
  const menuB = createSeededKeyLayout("menu");
  assert.deepEqual(menuA, menuB, "menu seeded layout is deterministic");

  for (const calculatorId of Object.keys(calculatorSeedManifest) as CalculatorId[]) {
    const seed = createSeededKeyLayout(calculatorId);
    assert.equal(seed.columns, controlProfiles[calculatorId].starts.alpha, `${calculatorId} seed columns derive from alpha`);
    assert.equal(seed.rows, controlProfiles[calculatorId].starts.beta, `${calculatorId} seed rows derive from beta`);
  }

  const g = createSeededKeyLayout("g");
  assert.equal(keyAt(g.keyLayout, g.columns, g.rows, 2, 2), k("toggle_binary_mode"), "g seed places binary toggle at R2C2");
  assert.equal(keyAt(g.keyLayout, g.columns, g.rows, 2, 1), k("exec_step_through"), "g seed places step-through at R2C1");
  assert.equal(keyAt(g.keyLayout, g.columns, g.rows, 1, 1), k("unary_not"), "g seed places not at R1C1");

  const fBase = initialState();
  const fColumns = fBase.ui.keypadColumns;
  const fRows = fBase.ui.keypadRows;
  const fLayout = fBase.ui.keyLayout;
  assert.equal(keyAt(fLayout, fColumns, fRows, 3, 2), k("system_save_quit_main_menu"), "f seed places Save&Quit at R3C2");
  assert.equal(keyAt(fLayout, fColumns, fRows, 3, 1), k("digit_1"), "f seed places digit_1 at R3C1");
  assert.equal(keyAt(fLayout, fColumns, fRows, 1, 2), k("unary_inc"), "f seed places increment at R1C2");
  assert.equal(keyAt(fLayout, fColumns, fRows, 1, 1), k("exec_equals"), "f seed places equals at R1C1");

  const fPrime = createSeededKeyLayout("f_prime");
  assert.equal(fPrime.columns, 6, "f' seed uses 6 columns");
  assert.equal(fPrime.rows, 5, "f' seed uses 5 rows");
  assert.equal(keyAt(fPrime.keyLayout, fPrime.columns, fPrime.rows, 5, 6), k("system_save_quit_main_menu"), "f' seed places Save&Quit at R5C6");
  assert.equal(keyAt(fPrime.keyLayout, fPrime.columns, fPrime.rows, 5, 5), k("viz_number_line"), "f' seed places number line at R5C5");
  assert.equal(keyAt(fPrime.keyLayout, fPrime.columns, fPrime.rows, 1, 5), null, "f' seed leaves blank slots as placeholders");

  const gPrime = createSeededKeyLayout("g_prime");
  assert.equal(gPrime.columns, 7, "g' seed uses 7 columns");
  assert.equal(gPrime.rows, 2, "g' seed uses 2 rows");
  assert.equal(keyAt(gPrime.keyLayout, gPrime.columns, gPrime.rows, 2, 7), k("toggle_binary_octave_cycle"), "g' seed places octave-cycle at R2C7");
  assert.equal(keyAt(gPrime.keyLayout, gPrime.columns, gPrime.rows, 2, 3), k("op_interval"), "g' seed places interval at R2C3");
  assert.equal(keyAt(gPrime.keyLayout, gPrime.columns, gPrime.rows, 1, 7), k("viz_ratios"), "g' seed places ratios visualizer at R1C7");
  assert.equal(keyAt(gPrime.keyLayout, gPrime.columns, gPrime.rows, 1, 1), k("exec_step_through"), "g' seed places step-through at R1C1");

  const hPrime = createSeededKeyLayout("h_prime");
  assert.equal(hPrime.columns, 4, "h' seed uses 4 columns");
  assert.equal(hPrime.rows, 5, "h' seed uses 5 rows");
  assert.equal(keyAt(hPrime.keyLayout, hPrime.columns, hPrime.rows, 5, 4), k("toggle_history"), "h' seed places history at R5C4");
  assert.equal(keyAt(hPrime.keyLayout, hPrime.columns, hPrime.rows, 4, 3), k("op_rotate_15"), "h' seed places rotate operator at R4C3");
  assert.equal(keyAt(hPrime.keyLayout, hPrime.columns, hPrime.rows, 1, 1), k("exec_equals"), "h' seed places equals at R1C1");

  const iPrime = createSeededKeyLayout("i_prime");
  assert.equal(iPrime.columns, 4, "i' seed uses 4 columns");
  assert.equal(iPrime.rows, 7, "i' seed uses 7 rows");
  assert.equal(keyAt(iPrime.keyLayout, iPrime.columns, iPrime.rows, 7, 1), k("toggle_mod_zero_to_delta"), "i' seed places mod range at R7C1");
  assert.equal(keyAt(iPrime.keyLayout, iPrime.columns, iPrime.rows, 5, 4), k("op_euclid_tuple"), "i' seed places euclid tuple at R5C4");
  assert.equal(keyAt(iPrime.keyLayout, iPrime.columns, iPrime.rows, 1, 1), k("exec_equals"), "i' seed places equals at R1C1");

  const ids = Object.keys(calculatorSeedManifest).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(ids, ["f", "f_prime", "g", "g_prime", "h_prime", "i_prime", "menu"], "seed manifest covers all calculator ids");
};
