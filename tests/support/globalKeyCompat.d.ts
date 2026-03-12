import type { KeyLike, KeyId } from "../../src/domain/keyPresentation.js";
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
  const k: (keyLike: KeyLike) => Key;
  const op: (keyLike: KeyLike) => BinarySlotOperator;
  const uop: (keyLike: KeyLike) => UnaryOperator;
  const slotOp: (keyLike: KeyLike) => SlotOperator;
  const keyCounts: (entries: Array<[KeyLike, number]>) => Partial<Record<KeyId, number>>;
  const valueExpr: (keyLike: KeyLike) => ValueExpressionKey;
  const utility: (keyLike: KeyLike) => UtilityKey;
  const memory: (keyLike: KeyLike) => MemoryKey;
  const execution: (keyLike: KeyLike) => ExecKey;
  const visualizer: (keyLike: KeyLike) => VisualizerKey;
  const keyCell: (keyLike: KeyLike, behavior?: KeyCell["behavior"]) => KeyCell;
  const valueExpressionUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<ValueExpressionKey, boolean>>;
  const slotOperatorUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<SlotOperator, boolean>>;
  const utilityUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<UtilityKey, boolean>>;
  const memoryUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<MemoryKey, boolean>>;
  const executionUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<ExecKey, boolean>>;
  const visualizerUnlockPatch: (
    entries: Array<[KeyLike, boolean]>,
  ) => Partial<Record<VisualizerKey, boolean>>;
}

export {};
