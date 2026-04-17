import { buttonRegistry } from "./buttonRegistry.js";

export const KEY_ID = {
  digit_0: "digit_0",
  digit_1: "digit_1",
  digit_2: "digit_2",
  digit_3: "digit_3",
  digit_4: "digit_4",
  digit_5: "digit_5",
  digit_6: "digit_6",
  digit_7: "digit_7",
  digit_8: "digit_8",
  digit_9: "digit_9",
  const_pi: "const_pi",
  const_e: "const_e",
  const_bottom: "const_bottom",
  const_roll_number: "const_roll_number",
  op_add: "op_add",
  op_sub: "op_sub",
  op_mul: "op_mul",
  op_pow: "op_pow",
  op_div: "op_div",
  op_euclid_div: "op_euclid_div",
  op_mod: "op_mod",
  op_rotate_left: "op_rotate_left",
  op_rotate_15: "op_rotate_15",
  op_gcd: "op_gcd",
  op_lcm: "op_lcm",
  op_max: "op_max",
  op_min: "op_min",
  unary_inc: "unary_inc",
  unary_dec: "unary_dec",
  unary_neg: "unary_neg",
  unary_sigma: "unary_sigma",
  unary_phi: "unary_phi",
  unary_omega: "unary_omega",
  unary_not: "unary_not",
  unary_collatz: "unary_collatz",
  unary_sort_asc: "unary_sort_asc",
  unary_floor: "unary_floor",
  unary_ceil: "unary_ceil",
  unary_mirror_digits: "unary_mirror_digits",
  unary_i: "unary_i",
  unary_rotate_15: "unary_rotate_15",
  util_clear_all: "util_clear_all",
  util_backspace: "util_backspace",
  util_undo: "util_undo",
  system_save_quit_main_menu: "system_save_quit_main_menu",
  system_quit_game: "system_quit_game",
  system_mode_game: "system_mode_game",
  system_new_game: "system_new_game",
  system_mode_sandbox: "system_mode_sandbox",
  toggle_delta_range_clamp: "toggle_delta_range_clamp",
  toggle_mod_zero_to_delta: "toggle_mod_zero_to_delta",
  toggle_binary_octave_cycle: "toggle_binary_octave_cycle",
  toggle_step_expansion: "toggle_step_expansion",
  toggle_binary_mode: "toggle_binary_mode",
  toggle_history: "toggle_history",
  viz_graph: "viz_graph",
  viz_feed: "viz_feed",
  viz_title: "viz_title",
  viz_release_notes: "viz_release_notes",
  viz_help: "viz_help",
  viz_factorization: "viz_factorization",
  viz_state: "viz_state",
  viz_number_line: "viz_number_line",
  viz_circle: "viz_circle",
  viz_ratios: "viz_ratios",
  viz_algebraic: "viz_algebraic",
  exec_equals: "exec_equals",
  exec_play_pause: "exec_play_pause",
  exec_step_through: "exec_step_through",
  exec_roll_inverse: "exec_roll_inverse",
} as const;

export type KeyId = (typeof KEY_ID)[keyof typeof KEY_ID];
export type DigitKeyId =
  | typeof KEY_ID.digit_0
  | typeof KEY_ID.digit_1
  | typeof KEY_ID.digit_2
  | typeof KEY_ID.digit_3
  | typeof KEY_ID.digit_4
  | typeof KEY_ID.digit_5
  | typeof KEY_ID.digit_6
  | typeof KEY_ID.digit_7
  | typeof KEY_ID.digit_8
  | typeof KEY_ID.digit_9;
export type ConstantKeyId =
  | typeof KEY_ID.const_pi
  | typeof KEY_ID.const_e
  | typeof KEY_ID.const_bottom
  | typeof KEY_ID.const_roll_number;
export type BinaryOperatorKeyId =
  | typeof KEY_ID.op_add
  | typeof KEY_ID.op_sub
  | typeof KEY_ID.op_mul
  | typeof KEY_ID.op_pow
  | typeof KEY_ID.op_div
  | typeof KEY_ID.op_euclid_div
  | typeof KEY_ID.op_mod
  | typeof KEY_ID.op_rotate_left
  | typeof KEY_ID.op_rotate_15
  | typeof KEY_ID.op_gcd
  | typeof KEY_ID.op_lcm
  | typeof KEY_ID.op_max
  | typeof KEY_ID.op_min;
export type UnaryOperatorKeyId =
  | typeof KEY_ID.unary_inc
  | typeof KEY_ID.unary_dec
  | typeof KEY_ID.unary_neg
  | typeof KEY_ID.unary_sigma
  | typeof KEY_ID.unary_phi
  | typeof KEY_ID.unary_omega
  | typeof KEY_ID.unary_not
  | typeof KEY_ID.unary_collatz
  | typeof KEY_ID.unary_sort_asc
  | typeof KEY_ID.unary_floor
  | typeof KEY_ID.unary_ceil
  | typeof KEY_ID.unary_mirror_digits
  | typeof KEY_ID.unary_i
  | typeof KEY_ID.unary_rotate_15;
export type MemoryKeyId = never;
export type UtilityKeyId =
  | typeof KEY_ID.util_clear_all
  | typeof KEY_ID.util_backspace
  | typeof KEY_ID.util_undo
  | typeof KEY_ID.system_save_quit_main_menu
  | typeof KEY_ID.system_quit_game
  | typeof KEY_ID.system_mode_game
  | typeof KEY_ID.system_new_game
  | typeof KEY_ID.system_mode_sandbox
  | typeof KEY_ID.toggle_delta_range_clamp
  | typeof KEY_ID.toggle_mod_zero_to_delta
  | typeof KEY_ID.toggle_binary_octave_cycle
  | typeof KEY_ID.toggle_step_expansion
  | typeof KEY_ID.toggle_binary_mode
  | typeof KEY_ID.toggle_history;
export type VisualizerKeyId =
  | typeof KEY_ID.viz_graph
  | typeof KEY_ID.viz_feed
  | typeof KEY_ID.viz_title
  | typeof KEY_ID.viz_release_notes
  | typeof KEY_ID.viz_help
  | typeof KEY_ID.viz_factorization
  | typeof KEY_ID.viz_state
  | typeof KEY_ID.viz_number_line
  | typeof KEY_ID.viz_circle
  | typeof KEY_ID.viz_ratios
  | typeof KEY_ID.viz_algebraic;
export type ExecKeyId =
  | typeof KEY_ID.exec_equals
  | typeof KEY_ID.exec_play_pause
  | typeof KEY_ID.exec_step_through
  | typeof KEY_ID.exec_roll_inverse;
export type ValueAtomKeyId = DigitKeyId | ConstantKeyId;
export type OperatorKeyId = BinaryOperatorKeyId | UnaryOperatorKeyId;
export const BOTTOM_VALUE_SYMBOL = "\u22A5";
export const ROLL_NUMBER_SYMBOL = "\u2116";

export type KeyPresentation = {
  keyId: KeyId;
  buttonFace: string;
  operatorInlineFace?: string;
  operatorSlotFace?: string;
  operatorAlgebraicFace?: string;
};

type KeyPresentationSeed = Omit<KeyPresentation, "keyId">;

const keySeedById = new Map<KeyId, KeyPresentationSeed>([
  [KEY_ID.digit_0, { buttonFace: "0" }],
  [KEY_ID.digit_1, { buttonFace: "1" }],
  [KEY_ID.digit_2, { buttonFace: "2" }],
  [KEY_ID.digit_3, { buttonFace: "3" }],
  [KEY_ID.digit_4, { buttonFace: "4" }],
  [KEY_ID.digit_5, { buttonFace: "5" }],
  [KEY_ID.digit_6, { buttonFace: "6" }],
  [KEY_ID.digit_7, { buttonFace: "7" }],
  [KEY_ID.digit_8, { buttonFace: "8" }],
  [KEY_ID.digit_9, { buttonFace: "9" }],
  [KEY_ID.const_pi, { buttonFace: "\u03C0" }],
  [KEY_ID.const_e, { buttonFace: "e" }],
  [KEY_ID.const_bottom, { buttonFace: BOTTOM_VALUE_SYMBOL }],
  [KEY_ID.const_roll_number, { buttonFace: ROLL_NUMBER_SYMBOL }],
  [KEY_ID.op_add, { buttonFace: "+", operatorInlineFace: "+", operatorSlotFace: "+", operatorAlgebraicFace: "+" }],
  [KEY_ID.op_sub, { buttonFace: "-", operatorInlineFace: "-", operatorSlotFace: "-", operatorAlgebraicFace: "-" }],
  [KEY_ID.op_mul, { buttonFace: "\u00D7", operatorInlineFace: "\u00D7", operatorSlotFace: "\u00D7", operatorAlgebraicFace: "\u00D7" }],
  [KEY_ID.op_pow, { buttonFace: "^", operatorInlineFace: "^", operatorSlotFace: "^", operatorAlgebraicFace: "^" }],
  [KEY_ID.op_div, { buttonFace: "\u00F7", operatorInlineFace: "\u00F7", operatorSlotFace: "\u00F7", operatorAlgebraicFace: "\u00F7" }],
  [KEY_ID.op_euclid_div, { buttonFace: "\u2AFD", operatorInlineFace: "\u2AFD", operatorSlotFace: "\u2AFD", operatorAlgebraicFace: "\u2AFD" }],
  [KEY_ID.op_mod, { buttonFace: "\u27E1", operatorInlineFace: "\u27E1", operatorSlotFace: "\u25C7", operatorAlgebraicFace: "\u27E1" }],
  [KEY_ID.op_rotate_left, { buttonFace: "\u21BA", operatorInlineFace: "\u21BA", operatorSlotFace: "\u21BA", operatorAlgebraicFace: "\u21BA" }],
  [KEY_ID.op_rotate_15, { buttonFace: "\u21B6", operatorInlineFace: "\u00D7e^(in\u03C0/12)", operatorSlotFace: "\u21B6", operatorAlgebraicFace: "\u00D7e^(in\u03C0/12)" }],
  [KEY_ID.op_gcd, { buttonFace: "\u22C0", operatorInlineFace: "\u22C0", operatorSlotFace: "\u22C0", operatorAlgebraicFace: "\u22C0" }],
  [KEY_ID.op_lcm, { buttonFace: "\u22C1", operatorInlineFace: "\u22C1", operatorSlotFace: "\u22C1", operatorAlgebraicFace: "\u22C1" }],
  [KEY_ID.op_max, { buttonFace: "\u2567", operatorInlineFace: "\u2567", operatorSlotFace: "\u2567", operatorAlgebraicFace: "\u2567" }],
  [KEY_ID.op_min, { buttonFace: "\u2564", operatorInlineFace: "\u2564", operatorSlotFace: "\u2564", operatorAlgebraicFace: "\u2564" }],
  [KEY_ID.unary_inc, { buttonFace: "+ +", operatorInlineFace: "++", operatorSlotFace: "++", operatorAlgebraicFace: "++" }],
  [KEY_ID.unary_dec, { buttonFace: "\u2212 \u2212", operatorInlineFace: "\u2212\u2212", operatorSlotFace: "\u2212\u2212", operatorAlgebraicFace: "\u2212\u2212" }],
  [KEY_ID.unary_neg, { buttonFace: "\u00B1", operatorInlineFace: "\u00B1", operatorSlotFace: "\u00B1", operatorAlgebraicFace: "\u00B1" }],
  [KEY_ID.unary_sigma, { buttonFace: "\u03C3", operatorInlineFace: "\u03C3", operatorSlotFace: "\u03C3", operatorAlgebraicFace: "\u03C3" }],
  [KEY_ID.unary_phi, { buttonFace: "\u03C6", operatorInlineFace: "\u03C6", operatorSlotFace: "\u03C6", operatorAlgebraicFace: "\u03C6" }],
  [KEY_ID.unary_omega, { buttonFace: "\u03A9", operatorInlineFace: "\u03A9", operatorSlotFace: "\u03A9", operatorAlgebraicFace: "\u03A9" }],
  [KEY_ID.unary_not, { buttonFace: "\u00AC", operatorInlineFace: "\u00AC", operatorSlotFace: "\u00AC", operatorAlgebraicFace: "\u00AC" }],
  [KEY_ID.unary_collatz, { buttonFace: "Ctz", operatorInlineFace: "Ctz", operatorSlotFace: "Ctz", operatorAlgebraicFace: "Ctz" }],
  [KEY_ID.unary_sort_asc, { buttonFace: "\u21E1d", operatorInlineFace: "\u21E1d", operatorSlotFace: "\u21E1", operatorAlgebraicFace: "\u21E1d" }],
  [KEY_ID.unary_floor, { buttonFace: "\u230An\u230B", operatorInlineFace: "\u230An\u230B", operatorSlotFace: "\u230An\u230B", operatorAlgebraicFace: "\u230An\u230B" }],
  [KEY_ID.unary_ceil, { buttonFace: "\u2308n\u2309", operatorInlineFace: "\u2308n\u2309", operatorSlotFace: "\u2308n\u2309", operatorAlgebraicFace: "\u2308n\u2309" }],
  [KEY_ID.unary_mirror_digits, { buttonFace: "\u21CBd", operatorInlineFace: "\u21CBd", operatorSlotFace: "\u21CB", operatorAlgebraicFace: "\u21CBd" }],
  [KEY_ID.unary_i, { buttonFace: "\u21B6 \u299C", operatorInlineFace: "\u00D7i", operatorSlotFace: "\u299D", operatorAlgebraicFace: "\u00D7i" }],
  [KEY_ID.unary_rotate_15, { buttonFace: "\u21B6 \u299C/6", operatorInlineFace: "\u00D7e^(i\u03C0/12)", operatorSlotFace: "\u299C/6", operatorAlgebraicFace: "\u00D7e^(i\u03C0/12)" }],
  [KEY_ID.util_clear_all, { buttonFace: "C" }],
  [KEY_ID.util_backspace, { buttonFace: "\u2190" }],
  [KEY_ID.util_undo, { buttonFace: "\u21A9" }],
  [KEY_ID.system_save_quit_main_menu, { buttonFace: "\u{1F5AB}\u27A0\u26ED" }],
  [KEY_ID.system_quit_game, { buttonFace: "Quit Game" }],
  [KEY_ID.system_mode_game, { buttonFace: "Continue" }],
  [KEY_ID.system_new_game, { buttonFace: "New Game" }],
  [KEY_ID.system_mode_sandbox, { buttonFace: "Sandbox" }],
  [KEY_ID.toggle_delta_range_clamp, { buttonFace: "[\u2013, +)" }],
  [KEY_ID.toggle_mod_zero_to_delta, { buttonFace: "[0, +)" }],
  [KEY_ID.toggle_binary_octave_cycle, { buttonFace: "\u{1D11E}" }],
  [KEY_ID.toggle_step_expansion, { buttonFace: "[ ??? ]" }],
  [KEY_ID.toggle_binary_mode, { buttonFace: "b\u2082" }],
  [KEY_ID.toggle_history, { buttonFace: "History" }],
  [KEY_ID.viz_graph, { buttonFace: "GRAPH" }],
  [KEY_ID.viz_feed, { buttonFace: "FEED" }],
  [KEY_ID.viz_title, { buttonFace: "TITLE" }],
  [KEY_ID.viz_release_notes, { buttonFace: "NOTES" }],
  [KEY_ID.viz_help, { buttonFace: "HELP" }],
  [KEY_ID.viz_factorization, { buttonFace: "\u2315" }],
  [KEY_ID.viz_state, { buttonFace: "STATE" }],
  [KEY_ID.viz_number_line, { buttonFace: "\u25FB" }],
  [KEY_ID.viz_circle, { buttonFace: "\u25EF" }],
  [KEY_ID.viz_ratios, { buttonFace: "RATIO" }],
  [KEY_ID.viz_algebraic, { buttonFace: "ALG" }],
  [KEY_ID.exec_equals, { buttonFace: "=" }],
  [KEY_ID.exec_play_pause, { buttonFace: "\u25B6" }],
  [KEY_ID.exec_step_through, { buttonFace: "[ \u25BA\u2758 ]" }],
  [KEY_ID.exec_roll_inverse, { buttonFace: "(=)\u207B\u00B9" }],
]);

const entries: KeyPresentation[] = buttonRegistry.map((entry) => {
  const seed = keySeedById.get(entry.key);
  if (!seed) {
    throw new Error(`Missing key presentation seed for ${entry.key}`);
  }
  return {
    keyId: entry.key,
    buttonFace: seed.buttonFace,
    ...(seed.operatorInlineFace ? { operatorInlineFace: seed.operatorInlineFace } : {}),
    ...(seed.operatorSlotFace ? { operatorSlotFace: seed.operatorSlotFace } : {}),
    ...(seed.operatorAlgebraicFace ? { operatorAlgebraicFace: seed.operatorAlgebraicFace } : {}),
  };
});

const keyById = new Map<KeyId, KeyPresentation>(entries.map((entry) => [entry.keyId, entry]));

export const keyPresentationCatalog = entries;

export const isKeyId = (value: string): value is KeyId => keyById.has(value as KeyId);
export const resolveKeyId = (keyId: KeyId): KeyId => keyId;

const getPresentation = (keyId: KeyId): KeyPresentation => {
  const entry = keyById.get(keyId);
  if (!entry) {
    throw new Error(`Missing key presentation entry for ${keyId}`);
  }
  return entry;
};

export const getKeyInternalRef = (keyId: KeyId): string => keyId;

export const getKeyButtonFaceLabel = (keyId: KeyId): string => getPresentation(keyId).buttonFace;

export const getOperatorInlineFaceLabel = (keyId: KeyId): string => {
  const entry = getPresentation(keyId);
  return entry.operatorInlineFace ?? entry.buttonFace;
};

export const getOperatorSlotFaceLabel = (keyId: KeyId): string => {
  const entry = getPresentation(keyId);
  return entry.operatorSlotFace ?? entry.operatorInlineFace ?? entry.buttonFace;
};

export const getOperatorAlgebraicFaceLabel = (keyId: KeyId): string => {
  const entry = getPresentation(keyId);
  return entry.operatorAlgebraicFace ?? entry.operatorInlineFace ?? entry.buttonFace;
};

export const getButtonFace = getKeyButtonFaceLabel;
export const getOperatorInlineFace = getOperatorInlineFaceLabel;
export const getOperatorSlotFace = getOperatorSlotFaceLabel;
export const getOperatorAlgebraicFace = getOperatorAlgebraicFaceLabel;

const DIGIT_KEY_ID_SET = new Set<DigitKeyId>([
  KEY_ID.digit_0,
  KEY_ID.digit_1,
  KEY_ID.digit_2,
  KEY_ID.digit_3,
  KEY_ID.digit_4,
  KEY_ID.digit_5,
  KEY_ID.digit_6,
  KEY_ID.digit_7,
  KEY_ID.digit_8,
  KEY_ID.digit_9,
]);
const BINARY_OPERATOR_KEY_ID_SET = new Set<BinaryOperatorKeyId>([
  KEY_ID.op_add,
  KEY_ID.op_sub,
  KEY_ID.op_mul,
  KEY_ID.op_pow,
  KEY_ID.op_div,
  KEY_ID.op_euclid_div,
  KEY_ID.op_mod,
  KEY_ID.op_rotate_left,
  KEY_ID.op_rotate_15,
  KEY_ID.op_gcd,
  KEY_ID.op_lcm,
  KEY_ID.op_max,
  KEY_ID.op_min,
]);
const UNARY_OPERATOR_KEY_ID_SET = new Set<UnaryOperatorKeyId>([
  KEY_ID.unary_inc,
  KEY_ID.unary_dec,
  KEY_ID.unary_neg,
  KEY_ID.unary_sigma,
  KEY_ID.unary_phi,
  KEY_ID.unary_omega,
  KEY_ID.unary_not,
  KEY_ID.unary_collatz,
  KEY_ID.unary_sort_asc,
  KEY_ID.unary_floor,
  KEY_ID.unary_ceil,
  KEY_ID.unary_mirror_digits,
  KEY_ID.unary_i,
  KEY_ID.unary_rotate_15,
]);
const MEMORY_KEY_ID_SET = new Set<MemoryKeyId>();

export const isDigitKeyId = (keyId: KeyId): keyId is DigitKeyId => DIGIT_KEY_ID_SET.has(keyId as DigitKeyId);
export const isBinaryOperatorKeyId = (keyId: KeyId): keyId is BinaryOperatorKeyId =>
  BINARY_OPERATOR_KEY_ID_SET.has(keyId as BinaryOperatorKeyId);
export const isUnaryOperatorId = (keyId: KeyId): keyId is UnaryOperatorKeyId =>
  UNARY_OPERATOR_KEY_ID_SET.has(keyId as UnaryOperatorKeyId);
export const isMemoryKeyId = (keyId: KeyId): keyId is MemoryKeyId =>
  MEMORY_KEY_ID_SET.has(keyId as MemoryKeyId);
export const isNaturalDivisorOperatorKeyId = (keyId: KeyId): boolean => {
  return keyId === KEY_ID.op_euclid_div || keyId === KEY_ID.op_mod;
};
export const isUnsupportedSymbolicOperatorKeyId = (keyId: KeyId): boolean => {
  return keyId === KEY_ID.op_euclid_div
    || keyId === KEY_ID.op_mod
    || keyId === KEY_ID.op_pow
    || keyId === KEY_ID.op_rotate_left
    || keyId === KEY_ID.op_rotate_15
    || keyId === KEY_ID.op_gcd
    || keyId === KEY_ID.op_lcm;
};
export const isConstantKeyId = (keyId: KeyId): keyId is ConstantKeyId => {
  return keyId === KEY_ID.const_pi
    || keyId === KEY_ID.const_e
    || keyId === KEY_ID.const_bottom
    || keyId === KEY_ID.const_roll_number;
};
