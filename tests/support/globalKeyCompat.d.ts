import type { KeyId } from "../../src/domain/keyPresentation.js";
import type {
  BinarySlotOperator,
  ExecKey,
  Key,
  KeyCell,
  MemoryKey,
  SlotOperator,
  UnaryOperator,
  UtilityKey,
  ValueExpressionKey,
  VisualizerKey,
} from "../../src/domain/types.js";

declare global {
  const k: (keyId: KeyId) => Key;
  const op: (keyId: KeyId) => BinarySlotOperator;
  const uop: (keyId: KeyId) => UnaryOperator;
  const slotOp: (keyId: KeyId) => SlotOperator;
  const keyCounts: (entries: Array<[KeyId, number]>) => Partial<Record<KeyId, number>>;
  const valueExpr: (keyId: KeyId) => ValueExpressionKey;
  const utility: (keyId: KeyId) => UtilityKey;
  const memory: (keyId: KeyId) => MemoryKey;
  const execution: (keyId: KeyId) => ExecKey;
  const visualizer: (keyId: KeyId) => VisualizerKey;
  const keyCell: (keyId: KeyId, behavior?: KeyCell["behavior"]) => KeyCell;
  const valueExpressionUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<ValueExpressionKey, boolean>>;
  const slotOperatorUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<SlotOperator, boolean>>;
  const utilityUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<UtilityKey, boolean>>;
  const memoryUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<MemoryKey, boolean>>;
  const executionUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<ExecKey, boolean>>;
  const visualizerUnlockPatch: (
    entries: Array<[KeyId, boolean]>,
  ) => Partial<Record<VisualizerKey, boolean>>;
}

export {};

