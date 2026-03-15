import {
  isBinaryOperatorKeyId,
  isMemoryKeyId,
  isDigitKeyId,
  isKeyId,
  isUnaryOperatorId,
  resolveKeyId,
  KEY_ID,
  type KeyId,
  type KeyLike,
} from "../../src/domain/keyPresentation.js";
import type {
  BinarySlotOperator,
  ExecKey,
  KeyCell,
  Key,
  SlotOperator,
  UtilityKey,
  ValueExpressionKey,
  VisualizerKey,
  MemoryKey,
  UnaryOperator,
} from "../../src/domain/types.js";

export const k = (keyLike: KeyLike): Key => resolveKeyId(keyLike);

export const op = (keyLike: KeyLike): BinarySlotOperator => {
  const keyId = resolveKeyId(keyLike);
  if (!isBinaryOperatorKeyId(keyId)) {
    throw new Error(`Expected binary operator key, received: ${keyLike}`);
  }
  return keyId;
};

export const uop = (keyLike: KeyLike): UnaryOperator => {
  const keyId = resolveKeyId(keyLike);
  if (!isUnaryOperatorId(keyId)) {
    throw new Error(`Expected unary operator key, received: ${keyLike}`);
  }
  return keyId;
};

export const keys = (keyLikes: readonly KeyLike[]): Key[] => keyLikes.map((keyLike) => k(keyLike));

export const slotOp = (keyLike: KeyLike): SlotOperator => {
  const keyId = resolveKeyId(keyLike);
  if (!isBinaryOperatorKeyId(keyId) && !isUnaryOperatorId(keyId)) {
    throw new Error(`Expected slot operator key, received: ${keyLike}`);
  }
  return keyId;
};

export const keyCounts = (entries: Array<[KeyLike, number]>): Partial<Record<KeyId, number>> =>
  Object.fromEntries(entries.map(([keyLike, count]) => [k(keyLike), count]));

const utilitySet = new Set<UtilityKey>([
  KEY_ID.util_clear_all,
  KEY_ID.util_backspace,
  KEY_ID.util_undo,
  KEY_ID.toggle_delta_range_clamp,
  KEY_ID.toggle_mod_zero_to_delta,
  KEY_ID.toggle_step_expansion,
]);

const visualizerSet = new Set<VisualizerKey>([
  KEY_ID.viz_graph,
  KEY_ID.viz_feed,
  KEY_ID.viz_factorization,
  KEY_ID.viz_circle,
  KEY_ID.viz_eigen_allocator,
  KEY_ID.viz_algebraic,
]);

export const valueExpr = (keyLike: KeyLike): ValueExpressionKey => {
  const keyId = resolveKeyId(keyLike);
  if (
    !isDigitKeyId(keyId) &&
    keyId !== KEY_ID.const_pi &&
    keyId !== KEY_ID.const_e
  ) {
    throw new Error(`Expected value-expression key, received: ${keyLike}`);
  }
  return keyId;
};

export const utility = (keyLike: KeyLike): UtilityKey => {
  const keyId = resolveKeyId(keyLike);
  if (!utilitySet.has(keyId as UtilityKey)) {
    throw new Error(`Expected utility key, received: ${keyLike}`);
  }
  return keyId as UtilityKey;
};

export const memory = (keyLike: KeyLike): MemoryKey => {
  const keyId = resolveKeyId(keyLike);
  if (!isMemoryKeyId(keyId)) {
    throw new Error(`Expected memory key, received: ${keyLike}`);
  }
  return keyId;
};

export const execution = (keyLike: KeyLike): ExecKey => {
  const keyId = resolveKeyId(keyLike);
  if (keyId !== KEY_ID.exec_equals && keyId !== KEY_ID.exec_step_through) {
    throw new Error(`Expected execution key, received: ${keyLike}`);
  }
  return keyId;
};

export const visualizer = (keyLike: KeyLike): VisualizerKey => {
  const keyId = resolveKeyId(keyLike);
  if (!visualizerSet.has(keyId as VisualizerKey)) {
    throw new Error(`Expected visualizer key, received: ${keyLike}`);
  }
  return keyId as VisualizerKey;
};

export const keyCell = (keyLike: KeyLike, behavior?: KeyCell["behavior"]): KeyCell => ({
  kind: "key",
  key: k(keyLike),
  ...(behavior ? { behavior } : {}),
});

export const valueExpressionUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<ValueExpressionKey, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [valueExpr(keyLike), enabled]));

export const slotOperatorUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<SlotOperator, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [slotOp(keyLike), enabled]));

export const utilityUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<UtilityKey, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [utility(keyLike), enabled]));

export const memoryUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<MemoryKey, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [memory(keyLike), enabled]));

export const executionUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<ExecKey, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [execution(keyLike), enabled]));

export const visualizerUnlockPatch = (
  entries: Array<[KeyLike, boolean]>,
): Partial<Record<VisualizerKey, boolean>> =>
  Object.fromEntries(entries.map(([keyLike, enabled]) => [visualizer(keyLike), enabled]));

export const asKeyId = (value: string): KeyId => {
  if (!isKeyId(value)) {
    throw new Error(`Expected keyId string, received: ${value}`);
  }
  return value;
};
