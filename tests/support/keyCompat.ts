import {
  isBinaryOperatorKeyId,
  isMemoryKeyId,
  isDigitKeyId,
  isKeyId,
  isUnaryOperatorId,
  resolveKeyId,
  KEY_ID,
  type KeyId,
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

export const k = (keyId: KeyId): Key => resolveKeyId(keyId);

export const op = (keyId: KeyId): BinarySlotOperator => {
  const resolved = resolveKeyId(keyId);
  if (!isBinaryOperatorKeyId(resolved)) {
    throw new Error(`Expected binary operator key, received: ${keyId}`);
  }
  return resolved;
};

export const uop = (keyId: KeyId): UnaryOperator => {
  const resolved = resolveKeyId(keyId);
  if (!isUnaryOperatorId(resolved)) {
    throw new Error(`Expected unary operator key, received: ${keyId}`);
  }
  return resolved;
};

export const keys = (keyIds: readonly KeyId[]): Key[] => keyIds.map((keyId) => k(keyId));

export const slotOp = (keyId: KeyId): SlotOperator => {
  const resolved = resolveKeyId(keyId);
  if (!isBinaryOperatorKeyId(resolved) && !isUnaryOperatorId(resolved)) {
    throw new Error(`Expected slot operator key, received: ${keyId}`);
  }
  return resolved;
};

export const keyCounts = (entries: Array<[KeyId, number]>): Partial<Record<KeyId, number>> =>
  Object.fromEntries(entries.map(([keyId, count]) => [k(keyId), count]));

const utilitySet = new Set<UtilityKey>([
  KEY_ID.util_clear_all,
  KEY_ID.util_backspace,
  KEY_ID.util_undo,
  KEY_ID.system_save_quit_main_menu,
  KEY_ID.system_quit_game,
  KEY_ID.system_mode_game,
  KEY_ID.system_new_game,
  KEY_ID.system_mode_sandbox,
  KEY_ID.toggle_delta_range_clamp,
  KEY_ID.toggle_mod_zero_to_delta,
  KEY_ID.toggle_step_expansion,
  KEY_ID.toggle_binary_mode,
]);

const visualizerSet = new Set<VisualizerKey>([
  KEY_ID.viz_graph,
  KEY_ID.viz_feed,
  KEY_ID.viz_title,
  KEY_ID.viz_release_notes,
  KEY_ID.viz_help,
  KEY_ID.viz_factorization,
  KEY_ID.viz_circle,
  KEY_ID.viz_number_line,
  KEY_ID.viz_eigen_allocator,
  KEY_ID.viz_algebraic,
]);

export const valueExpr = (keyId: KeyId): ValueExpressionKey => {
  const resolved = resolveKeyId(keyId);
  if (
    !isDigitKeyId(resolved) &&
    resolved !== KEY_ID.const_pi &&
    resolved !== KEY_ID.const_e
  ) {
    throw new Error(`Expected value-expression key, received: ${keyId}`);
  }
  return resolved;
};

export const utility = (keyId: KeyId): UtilityKey => {
  const resolved = resolveKeyId(keyId);
  if (!utilitySet.has(resolved as UtilityKey)) {
    throw new Error(`Expected utility key, received: ${keyId}`);
  }
  return resolved as UtilityKey;
};

export const memory = (keyId: KeyId): MemoryKey => {
  const resolved = resolveKeyId(keyId);
  if (!isMemoryKeyId(resolved)) {
    throw new Error(`Expected memory key, received: ${keyId}`);
  }
  return resolved;
};

export const execution = (keyId: KeyId): ExecKey => {
  const resolved = resolveKeyId(keyId);
  if (
    resolved !== KEY_ID.exec_equals
    && resolved !== KEY_ID.exec_play_pause
    && resolved !== KEY_ID.exec_step_through
    && resolved !== KEY_ID.exec_roll_inverse
  ) {
    throw new Error(`Expected execution key, received: ${keyId}`);
  }
  return resolved;
};

export const visualizer = (keyId: KeyId): VisualizerKey => {
  const resolved = resolveKeyId(keyId);
  if (!visualizerSet.has(resolved as VisualizerKey)) {
    throw new Error(`Expected visualizer key, received: ${keyId}`);
  }
  return resolved as VisualizerKey;
};

export const keyCell = (keyId: KeyId, behavior?: KeyCell["behavior"]): KeyCell => ({
  kind: "key",
  key: k(keyId),
  ...(behavior ? { behavior } : {}),
});

export const valueExpressionUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<ValueExpressionKey, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [valueExpr(keyId), enabled]));

export const slotOperatorUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<SlotOperator, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [slotOp(keyId), enabled]));

export const utilityUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<UtilityKey, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [utility(keyId), enabled]));

export const memoryUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<MemoryKey, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [memory(keyId), enabled]));

export const executionUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<ExecKey, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [execution(keyId), enabled]));

export const visualizerUnlockPatch = (
  entries: Array<[KeyId, boolean]>,
): Partial<Record<VisualizerKey, boolean>> =>
  Object.fromEntries(entries.map(([keyId, enabled]) => [visualizer(keyId), enabled]));

export const asKeyId = (value: string): KeyId => {
  if (!isKeyId(value)) {
    throw new Error(`Expected keyId string, received: ${value}`);
  }
  return value;
};

