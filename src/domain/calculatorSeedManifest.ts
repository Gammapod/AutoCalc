import { toIndexFromCoord } from "./keypadLayoutModel.js";
import { KEY_ID } from "./keyPresentation.js";
import type { CalculatorId, Key, LayoutCell } from "./types.js";
import { controlProfiles } from "./controlProfilesCatalog.js";
import { sanitizeLambdaControl } from "./lambdaControl.js";

type SeedPlacement = {
  row: number;
  col: number;
  key: Key;
  behavior?: Extract<LayoutCell, { kind: "key" }>["behavior"];
};

export type CalculatorSeedSpec = {
  calculatorId: CalculatorId;
  activeVisualizer: "total" | "title";
  placements: readonly SeedPlacement[];
};

const fPlacements: readonly SeedPlacement[] = [
  { row: 3, col: 2, key: KEY_ID.system_save_quit_main_menu },
  { row: 3, col: 1, key: KEY_ID.digit_1 },
  { row: 1, col: 2, key: KEY_ID.unary_inc },
  { row: 1, col: 1, key: KEY_ID.exec_equals },
];

const gPlacements: readonly SeedPlacement[] = [
  { row: 2, col: 2, key: KEY_ID.toggle_binary_mode, behavior: { type: "toggle_flag", flag: "settings.binary_mode" } },
  { row: 2, col: 1, key: KEY_ID.exec_step_through },
  { row: 1, col: 1, key: KEY_ID.unary_not },
];

const menuPlacements: readonly SeedPlacement[] = [
  { row: 6, col: 1, key: KEY_ID.viz_title },
  { row: 5, col: 1, key: KEY_ID.viz_release_notes },
  { row: 4, col: 1, key: KEY_ID.system_mode_game },
  { row: 3, col: 1, key: KEY_ID.system_new_game },
  { row: 2, col: 1, key: KEY_ID.system_mode_sandbox },
  { row: 1, col: 1, key: KEY_ID.system_quit_game },
];

const fPrimePlacements: readonly SeedPlacement[] = [
  { row: 5, col: 6, key: KEY_ID.system_save_quit_main_menu },
  { row: 5, col: 5, key: KEY_ID.viz_number_line },
  { row: 5, col: 3, key: KEY_ID.toggle_step_expansion },
  { row: 5, col: 2, key: KEY_ID.util_backspace },
  { row: 5, col: 1, key: KEY_ID.util_clear_all },
  { row: 4, col: 6, key: KEY_ID.digit_7 },
  { row: 4, col: 5, key: KEY_ID.digit_8 },
  { row: 4, col: 4, key: KEY_ID.digit_9 },
  { row: 4, col: 3, key: KEY_ID.unary_floor },
  { row: 4, col: 2, key: KEY_ID.unary_ceil },
  { row: 4, col: 1, key: KEY_ID.exec_roll_inverse },
  { row: 3, col: 6, key: KEY_ID.digit_4 },
  { row: 3, col: 5, key: KEY_ID.digit_5 },
  { row: 3, col: 4, key: KEY_ID.digit_6 },
  { row: 3, col: 3, key: KEY_ID.op_pow },
  { row: 2, col: 6, key: KEY_ID.digit_1 },
  { row: 2, col: 5, key: KEY_ID.digit_2 },
  { row: 2, col: 4, key: KEY_ID.digit_3 },
  { row: 2, col: 3, key: KEY_ID.op_mul },
  { row: 2, col: 2, key: KEY_ID.op_euclid_div },
  { row: 2, col: 1, key: KEY_ID.op_mod },
  { row: 1, col: 6, key: KEY_ID.digit_0 },
  { row: 1, col: 4, key: KEY_ID.unary_neg },
  { row: 1, col: 3, key: KEY_ID.op_add },
  { row: 1, col: 2, key: KEY_ID.op_sub },
  { row: 1, col: 1, key: KEY_ID.exec_equals },
];

const gPrimePlacements: readonly SeedPlacement[] = [
  { row: 2, col: 7, key: KEY_ID.toggle_binary_octave_cycle, behavior: { type: "toggle_flag", flag: "settings.binary_octave_cycle" } },
  { row: 2, col: 6, key: KEY_ID.op_mul },
  { row: 2, col: 5, key: KEY_ID.op_div },
  { row: 2, col: 4, key: KEY_ID.unary_reciprocal },
  { row: 2, col: 3, key: KEY_ID.op_interval },
  { row: 2, col: 2, key: KEY_ID.op_whole_steps },
  { row: 2, col: 1, key: KEY_ID.util_clear_all },
  { row: 1, col: 7, key: KEY_ID.viz_ratios },
  { row: 1, col: 6, key: KEY_ID.digit_1 },
  { row: 1, col: 5, key: KEY_ID.digit_2 },
  { row: 1, col: 4, key: KEY_ID.digit_4 },
  { row: 1, col: 3, key: KEY_ID.digit_8 },
  { row: 1, col: 2, key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: "execution.pause" } },
  { row: 1, col: 1, key: KEY_ID.exec_step_through },
];

const hPrimePlacements: readonly SeedPlacement[] = [
  { row: 5, col: 4, key: KEY_ID.toggle_history, behavior: { type: "toggle_flag", flag: "settings.history" } },
  { row: 5, col: 3, key: KEY_ID.toggle_forecast, behavior: { type: "toggle_flag", flag: "settings.forecast" } },
  { row: 5, col: 2, key: KEY_ID.util_backspace },
  { row: 5, col: 1, key: KEY_ID.util_clear_all },
  { row: 4, col: 3, key: KEY_ID.op_rotate_15 },
  { row: 4, col: 2, key: KEY_ID.unary_rotate_15 },
  { row: 4, col: 1, key: KEY_ID.unary_neg },
  { row: 3, col: 4, key: KEY_ID.unary_imaginary_part },
  { row: 3, col: 3, key: KEY_ID.unary_minus_i },
  { row: 3, col: 2, key: KEY_ID.unary_plus_i },
  { row: 3, col: 1, key: KEY_ID.unary_conjugate },
  { row: 2, col: 4, key: KEY_ID.unary_real_part },
  { row: 2, col: 3, key: KEY_ID.unary_dec },
  { row: 2, col: 2, key: KEY_ID.unary_inc },
  { row: 2, col: 1, key: KEY_ID.unary_real_flip },
  { row: 1, col: 4, key: KEY_ID.viz_graph },
  { row: 1, col: 3, key: KEY_ID.viz_number_line },
  { row: 1, col: 2, key: KEY_ID.viz_circle },
  { row: 1, col: 1, key: KEY_ID.exec_equals },
];

const iPrimePlacements: readonly SeedPlacement[] = [
  { row: 7, col: 4, key: KEY_ID.toggle_history, behavior: { type: "toggle_flag", flag: "settings.history" } },
  { row: 7, col: 3, key: KEY_ID.toggle_step_expansion, behavior: { type: "toggle_flag", flag: "settings.step_expansion" } },
  { row: 7, col: 2, key: KEY_ID.toggle_cycle, behavior: { type: "toggle_flag", flag: "settings.cycle" } },
  { row: 7, col: 1, key: KEY_ID.toggle_mod_zero_to_delta, behavior: { type: "toggle_flag", flag: "settings.mod_zero_to_delta" } },
  { row: 6, col: 4, key: KEY_ID.viz_feed },
  { row: 6, col: 3, key: KEY_ID.viz_number_line },
  { row: 6, col: 2, key: KEY_ID.util_backspace },
  { row: 6, col: 1, key: KEY_ID.util_clear_all },
  { row: 5, col: 4, key: KEY_ID.op_euclid_tuple },
  { row: 5, col: 3, key: KEY_ID.op_euclid_div },
  { row: 5, col: 2, key: KEY_ID.op_mod },
  { row: 5, col: 1, key: KEY_ID.unary_reciprocal },
  { row: 4, col: 4, key: KEY_ID.op_rotate_15 },
  { row: 4, col: 3, key: KEY_ID.unary_i },
  { row: 4, col: 2, key: KEY_ID.unary_neg },
  { row: 4, col: 1, key: KEY_ID.op_mul },
  { row: 3, col: 4, key: KEY_ID.digit_1 },
  { row: 3, col: 3, key: KEY_ID.digit_2 },
  { row: 3, col: 2, key: KEY_ID.digit_3 },
  { row: 3, col: 1, key: KEY_ID.op_add },
  { row: 2, col: 4, key: KEY_ID.digit_4 },
  { row: 2, col: 3, key: KEY_ID.digit_5 },
  { row: 2, col: 2, key: KEY_ID.digit_6 },
  { row: 2, col: 1, key: KEY_ID.op_sub },
  { row: 1, col: 4, key: KEY_ID.digit_7 },
  { row: 1, col: 3, key: KEY_ID.digit_8 },
  { row: 1, col: 2, key: KEY_ID.digit_9 },
  { row: 1, col: 1, key: KEY_ID.exec_equals },
];

export const calculatorSeedManifest: Readonly<Record<CalculatorId, CalculatorSeedSpec>> = {
  f: {
    calculatorId: "f",
    activeVisualizer: "total",
    placements: fPlacements,
  },
  g: {
    calculatorId: "g",
    activeVisualizer: "total",
    placements: gPlacements,
  },
  menu: {
    calculatorId: "menu",
    activeVisualizer: "title",
    placements: menuPlacements,
  },
  f_prime: {
    calculatorId: "f_prime",
    activeVisualizer: "total",
    placements: fPrimePlacements,
  },
  g_prime: {
    calculatorId: "g_prime",
    activeVisualizer: "total",
    placements: gPrimePlacements,
  },
  h_prime: {
    calculatorId: "h_prime",
    activeVisualizer: "total",
    placements: hPrimePlacements,
  },
  i_prime: {
    calculatorId: "i_prime",
    activeVisualizer: "total",
    placements: iPrimePlacements,
  },
};

export const applyCalculatorSeedPlacements = (
  calculatorId: CalculatorId,
  layout: LayoutCell[],
  columns: number,
  rows: number,
): LayoutCell[] => {
  const seeded = layout.map((cell) => ({ ...cell }));
  for (const placement of calculatorSeedManifest[calculatorId].placements) {
    const index = toIndexFromCoord({ row: placement.row, col: placement.col }, columns, rows);
    if (index < 0 || index >= seeded.length) {
      continue;
    }
    seeded[index] = placement.behavior
      ? { kind: "key", key: placement.key, behavior: placement.behavior }
      : { kind: "key", key: placement.key };
  }
  return seeded;
};

export const createSeededKeyLayout = (
  calculatorId: CalculatorId,
  override?: { columns?: number; rows?: number },
): { keyLayout: LayoutCell[]; columns: number; rows: number; activeVisualizer: "total" | "title" } => {
  const seed = calculatorSeedManifest[calculatorId];
  const profileStarts = sanitizeLambdaControl(controlProfiles[calculatorId].starts, controlProfiles[calculatorId]);
  const columns = override?.columns ?? profileStarts.alpha;
  const rows = override?.rows ?? profileStarts.beta;
  const layout: LayoutCell[] = Array.from(
    { length: Math.max(1, columns * rows) },
    () => ({ kind: "placeholder", area: "empty" as const }),
  );
  return {
    keyLayout: applyCalculatorSeedPlacements(calculatorId, layout, columns, rows),
    columns,
    rows,
    activeVisualizer: seed.activeVisualizer,
  };
};
