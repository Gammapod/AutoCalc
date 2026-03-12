import { buttonRegistry, isButtonKey, type ButtonKey } from "./buttonRegistry.js";

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
  op_add: "op_add",
  op_sub: "op_sub",
  op_mul: "op_mul",
  op_div: "op_div",
  op_euclid_div: "op_euclid_div",
  op_mod: "op_mod",
  op_rotate_left: "op_rotate_left",
  op_gcd: "op_gcd",
  op_lcm: "op_lcm",
  unary_inc: "unary_inc",
  unary_dec: "unary_dec",
  unary_neg: "unary_neg",
  unary_sigma: "unary_sigma",
  unary_phi: "unary_phi",
  unary_omega: "unary_omega",
  util_clear_all: "util_clear_all",
  util_clear_entry: "util_clear_entry",
  util_backspace: "util_backspace",
  util_undo: "util_undo",
  memory_cycle_variable: "memory_cycle_variable",
  memory_adjust_plus: "memory_adjust_plus",
  memory_adjust_minus: "memory_adjust_minus",
  memory_recall: "memory_recall",
  toggle_delta_range_clamp: "toggle_delta_range_clamp",
  viz_graph: "viz_graph",
  viz_feed: "viz_feed",
  viz_factorization: "viz_factorization",
  viz_circle: "viz_circle",
  viz_eigen_allocator: "viz_eigen_allocator",
  viz_algebraic: "viz_algebraic",
  exec_equals: "exec_equals",
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
export type ConstantKeyId = typeof KEY_ID.const_pi | typeof KEY_ID.const_e;
export type BinaryOperatorKeyId =
  | typeof KEY_ID.op_add
  | typeof KEY_ID.op_sub
  | typeof KEY_ID.op_mul
  | typeof KEY_ID.op_div
  | typeof KEY_ID.op_euclid_div
  | typeof KEY_ID.op_mod
  | typeof KEY_ID.op_rotate_left
  | typeof KEY_ID.op_gcd
  | typeof KEY_ID.op_lcm;
export type UnaryOperatorKeyId =
  | typeof KEY_ID.unary_inc
  | typeof KEY_ID.unary_dec
  | typeof KEY_ID.unary_neg
  | typeof KEY_ID.unary_sigma
  | typeof KEY_ID.unary_phi
  | typeof KEY_ID.unary_omega;
export type MemoryKeyId =
  | typeof KEY_ID.memory_cycle_variable
  | typeof KEY_ID.memory_adjust_plus
  | typeof KEY_ID.memory_adjust_minus
  | typeof KEY_ID.memory_recall;
export type UtilityKeyId =
  | typeof KEY_ID.util_clear_all
  | typeof KEY_ID.util_clear_entry
  | typeof KEY_ID.util_backspace
  | typeof KEY_ID.util_undo
  | typeof KEY_ID.toggle_delta_range_clamp;
export type VisualizerKeyId =
  | typeof KEY_ID.viz_graph
  | typeof KEY_ID.viz_feed
  | typeof KEY_ID.viz_factorization
  | typeof KEY_ID.viz_circle
  | typeof KEY_ID.viz_eigen_allocator
  | typeof KEY_ID.viz_algebraic;
export type ExecKeyId = typeof KEY_ID.exec_equals;
export type ValueAtomKeyId = DigitKeyId | ConstantKeyId;
export type OperatorKeyId = BinaryOperatorKeyId | UnaryOperatorKeyId;

export type KeyPresentation = {
  keyId: KeyId;
  legacyKey: ButtonKey;
  buttonFace: string;
  operatorInlineFace?: string;
  operatorSlotFace?: string;
  operatorAlgebraicFace?: string;
};

type KeyPresentationSeed = Omit<KeyPresentation, "legacyKey">;

const FACTORIZATION_LEGACY_KEY = buttonRegistry.find((entry) => ("visualizerId" in entry ? entry.visualizerId : undefined) === "factorization")?.key;
if (!FACTORIZATION_LEGACY_KEY) {
  throw new Error("Missing factorization key in button registry.");
}

const keySeedByLegacy = new Map<ButtonKey, KeyPresentationSeed>([
  ["0", { keyId: KEY_ID.digit_0, buttonFace: "0" }],
  ["1", { keyId: KEY_ID.digit_1, buttonFace: "1" }],
  ["2", { keyId: KEY_ID.digit_2, buttonFace: "2" }],
  ["3", { keyId: KEY_ID.digit_3, buttonFace: "3" }],
  ["4", { keyId: KEY_ID.digit_4, buttonFace: "4" }],
  ["5", { keyId: KEY_ID.digit_5, buttonFace: "5" }],
  ["6", { keyId: KEY_ID.digit_6, buttonFace: "6" }],
  ["7", { keyId: KEY_ID.digit_7, buttonFace: "7" }],
  ["8", { keyId: KEY_ID.digit_8, buttonFace: "8" }],
  ["9", { keyId: KEY_ID.digit_9, buttonFace: "9" }],
  ["pi", { keyId: KEY_ID.const_pi, buttonFace: "\u03C0" }],
  ["e", { keyId: KEY_ID.const_e, buttonFace: "e" }],
  ["+", { keyId: KEY_ID.op_add, buttonFace: "+", operatorInlineFace: "+", operatorSlotFace: "+", operatorAlgebraicFace: "+" }],
  ["-", { keyId: KEY_ID.op_sub, buttonFace: "-", operatorInlineFace: "-", operatorSlotFace: "-", operatorAlgebraicFace: "-" }],
  ["*", { keyId: KEY_ID.op_mul, buttonFace: "\u00D7", operatorInlineFace: "\u00D7", operatorSlotFace: "\u00D7", operatorAlgebraicFace: "\u00D7" }],
  ["/", { keyId: KEY_ID.op_div, buttonFace: "\u00F7", operatorInlineFace: "\u00F7", operatorSlotFace: "\u00F7", operatorAlgebraicFace: "\u00F7" }],
  ["#", { keyId: KEY_ID.op_euclid_div, buttonFace: "#/\u27E1", operatorInlineFace: "#", operatorSlotFace: "#", operatorAlgebraicFace: "#" }],
  ["\u27E1", { keyId: KEY_ID.op_mod, buttonFace: "\u27E1", operatorInlineFace: "\u27E1", operatorSlotFace: "\u2662", operatorAlgebraicFace: "\u27E1" }],
  ["\u21BA", { keyId: KEY_ID.op_rotate_left, buttonFace: "\u21BA", operatorInlineFace: "\u21BA", operatorSlotFace: "\u21BA", operatorAlgebraicFace: "\u21BA" }],
  ["\u2A51", { keyId: KEY_ID.op_gcd, buttonFace: "\u2A51", operatorInlineFace: "\u2A51", operatorSlotFace: "\u2A51", operatorAlgebraicFace: "\u2A51" }],
  ["\u2A52", { keyId: KEY_ID.op_lcm, buttonFace: "\u2A52", operatorInlineFace: "\u2A52", operatorSlotFace: "\u2A52", operatorAlgebraicFace: "\u2A52" }],
  ["++", { keyId: KEY_ID.unary_inc, buttonFace: "++", operatorInlineFace: "++", operatorSlotFace: "++", operatorAlgebraicFace: "++" }],
  ["--", { keyId: KEY_ID.unary_dec, buttonFace: "\u2212\u2212", operatorInlineFace: "\u2212\u2212", operatorSlotFace: "\u2212\u2212", operatorAlgebraicFace: "\u2212\u2212" }],
  ["-n", { keyId: KEY_ID.unary_neg, buttonFace: "\u00B1", operatorInlineFace: "\u00B1", operatorSlotFace: "\u00B1", operatorAlgebraicFace: "\u00B1" }],
  ["\u03C3", { keyId: KEY_ID.unary_sigma, buttonFace: "\u03C3", operatorInlineFace: "\u03C3", operatorSlotFace: "\u03C3", operatorAlgebraicFace: "\u03C3" }],
  ["\u03C6", { keyId: KEY_ID.unary_phi, buttonFace: "\u03C6", operatorInlineFace: "\u03C6", operatorSlotFace: "\u03C6", operatorAlgebraicFace: "\u03C6" }],
  ["\u03A9", { keyId: KEY_ID.unary_omega, buttonFace: "\u03A9", operatorInlineFace: "\u03A9", operatorSlotFace: "\u03A9", operatorAlgebraicFace: "\u03A9" }],
  ["C", { keyId: KEY_ID.util_clear_all, buttonFace: "C" }],
  ["CE", { keyId: KEY_ID.util_clear_entry, buttonFace: "CE" }],
  ["\u2190", { keyId: KEY_ID.util_backspace, buttonFace: "\u2190" }],
  ["UNDO", { keyId: KEY_ID.util_undo, buttonFace: "\u2936" }],
  ["\u03B1,\u03B2,\u03B3", { keyId: KEY_ID.memory_cycle_variable, buttonFace: "\u03B1,\u03B2,\u03B3" }],
  ["M+", { keyId: KEY_ID.memory_adjust_plus, buttonFace: "M+" }],
  ["M\u2013", { keyId: KEY_ID.memory_adjust_minus, buttonFace: "M\u2013" }],
  ["M\u2192", { keyId: KEY_ID.memory_recall, buttonFace: "M\u2192" }],
  ["\u27E1[-\u{1D6FF}, \u{1D6FF})", { keyId: KEY_ID.toggle_delta_range_clamp, buttonFace: "\u27E1[-\u{1D6FF}, \u{1D6FF})" }],
  ["GRAPH", { keyId: KEY_ID.viz_graph, buttonFace: "GRAPH" }],
  ["FEED", { keyId: KEY_ID.viz_feed, buttonFace: "FEED" }],
  [FACTORIZATION_LEGACY_KEY, { keyId: KEY_ID.viz_factorization, buttonFace: "\u{1D6B7}\u{1D45D}\u{1D49}" }],
  ["CIRCLE", { keyId: KEY_ID.viz_circle, buttonFace: "\u25EF" }],
  ["\u03BB", { keyId: KEY_ID.viz_eigen_allocator, buttonFace: "\u03BB" }],
  ["ALG", { keyId: KEY_ID.viz_algebraic, buttonFace: "ALG" }],
  ["=", { keyId: KEY_ID.exec_equals, buttonFace: "=" }],
]);

const entries: KeyPresentation[] = buttonRegistry.map((entry) => {
  const seed = keySeedByLegacy.get(entry.key);
  if (!seed) {
    throw new Error(`Missing key presentation seed for ${entry.key}`);
  }
  return {
    keyId: seed.keyId,
    legacyKey: entry.key,
    buttonFace: seed.buttonFace,
    ...(seed.operatorInlineFace ? { operatorInlineFace: seed.operatorInlineFace } : {}),
    ...(seed.operatorSlotFace ? { operatorSlotFace: seed.operatorSlotFace } : {}),
    ...(seed.operatorAlgebraicFace ? { operatorAlgebraicFace: seed.operatorAlgebraicFace } : {}),
  };
});

const duplicateKeyIds = new Set<KeyId>();
const keyIdSeen = new Set<KeyId>();
for (const entry of entries) {
  if (keyIdSeen.has(entry.keyId)) {
    duplicateKeyIds.add(entry.keyId);
  }
  keyIdSeen.add(entry.keyId);
}
if (duplicateKeyIds.size > 0) {
  throw new Error(`Duplicate key ids detected: ${Array.from(duplicateKeyIds).join(", ")}`);
}

const keyByLegacy = new Map<ButtonKey, KeyPresentation>(entries.map((entry) => [entry.legacyKey, entry]));
const keyById = new Map<KeyId, KeyPresentation>(entries.map((entry) => [entry.keyId, entry]));

export const keyPresentationCatalog = entries;
export type LegacyKey = ButtonKey;
export type KeyLike = KeyId | LegacyKey;

export const isLegacyKey = (value: string): value is LegacyKey => isButtonKey(value);
export const isKeyId = (value: string): value is KeyId => keyById.has(value as KeyId);

export const toKeyId = (legacyKey: LegacyKey): KeyId => {
  const entry = keyByLegacy.get(legacyKey);
  if (!entry) {
    throw new Error(`Unsupported legacy key: ${legacyKey}`);
  }
  return entry.keyId;
};

export const toLegacyKey = (keyId: KeyId): LegacyKey => {
  const entry = keyById.get(keyId);
  if (!entry) {
    throw new Error(`Unsupported key id: ${keyId}`);
  }
  return entry.legacyKey;
};

export const resolveKeyId = (keyLike: KeyLike): KeyId => (isKeyId(keyLike) ? keyLike : toKeyId(keyLike));

const getPresentation = (keyLike: KeyLike): KeyPresentation => {
  const keyId = resolveKeyId(keyLike);
  const entry = keyById.get(keyId);
  if (!entry) {
    throw new Error(`Missing key presentation entry for ${keyId}`);
  }
  return entry;
};

export const getKeyInternalRef = (keyLike: KeyLike): string => resolveKeyId(keyLike);

export const getKeyButtonFaceLabel = (keyLike: KeyLike): string => getPresentation(keyLike).buttonFace;

export const getOperatorInlineFaceLabel = (keyLike: KeyLike): string => {
  const entry = getPresentation(keyLike);
  return entry.operatorInlineFace ?? entry.buttonFace;
};

export const getOperatorSlotFaceLabel = (keyLike: KeyLike): string => {
  const entry = getPresentation(keyLike);
  return entry.operatorSlotFace ?? entry.operatorInlineFace ?? entry.buttonFace;
};

export const getOperatorAlgebraicFaceLabel = (keyLike: KeyLike): string => {
  const entry = getPresentation(keyLike);
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
  KEY_ID.op_div,
  KEY_ID.op_euclid_div,
  KEY_ID.op_mod,
  KEY_ID.op_rotate_left,
  KEY_ID.op_gcd,
  KEY_ID.op_lcm,
]);
const UNARY_OPERATOR_KEY_ID_SET = new Set<UnaryOperatorKeyId>([
  KEY_ID.unary_inc,
  KEY_ID.unary_dec,
  KEY_ID.unary_neg,
  KEY_ID.unary_sigma,
  KEY_ID.unary_phi,
  KEY_ID.unary_omega,
]);
const MEMORY_KEY_ID_SET = new Set<MemoryKeyId>([
  KEY_ID.memory_cycle_variable,
  KEY_ID.memory_adjust_plus,
  KEY_ID.memory_adjust_minus,
  KEY_ID.memory_recall,
]);

export const isDigitKeyId = (keyLike: KeyLike): keyLike is DigitKeyId => DIGIT_KEY_ID_SET.has(resolveKeyId(keyLike) as DigitKeyId);
export const isBinaryOperatorKeyId = (keyLike: KeyLike): keyLike is BinaryOperatorKeyId =>
  BINARY_OPERATOR_KEY_ID_SET.has(resolveKeyId(keyLike) as BinaryOperatorKeyId);
export const isUnaryOperatorId = (keyLike: KeyLike): keyLike is UnaryOperatorKeyId =>
  UNARY_OPERATOR_KEY_ID_SET.has(resolveKeyId(keyLike) as UnaryOperatorKeyId);
export const isMemoryKeyId = (keyLike: KeyLike): keyLike is MemoryKeyId =>
  MEMORY_KEY_ID_SET.has(resolveKeyId(keyLike) as MemoryKeyId);
export const isNaturalDivisorOperatorKeyId = (keyLike: KeyLike): boolean => {
  const keyId = resolveKeyId(keyLike);
  return keyId === KEY_ID.op_euclid_div || keyId === KEY_ID.op_mod;
};
export const isUnsupportedSymbolicOperatorKeyId = (keyLike: KeyLike): boolean => {
  const keyId = resolveKeyId(keyLike);
  return keyId === KEY_ID.op_euclid_div
    || keyId === KEY_ID.op_mod
    || keyId === KEY_ID.op_rotate_left
    || keyId === KEY_ID.op_gcd
    || keyId === KEY_ID.op_lcm;
};
export const isConstantKeyId = (keyLike: KeyLike): keyLike is ConstantKeyId => {
  const keyId = resolveKeyId(keyLike);
  return keyId === KEY_ID.const_pi || keyId === KEY_ID.const_e;
};
