import { calculatorValueToDisplayString } from "./calculatorValue.js";
import { buildGraphPoints } from "./graphProjection.js";
import type { GameState } from "./types.js";

export type DomainReadModel = {
  totalDisplay: string;
  rollView: { lines: string[]; lineCount: number };
  slotView: string;
  unlockRows: Array<{ id: string; done: boolean }>;
  graphPoints: ReturnType<typeof buildGraphPoints>;
  graphVisible: boolean;
};

const buildRollView = (state: GameState): { lines: string[]; lineCount: number } => {
  const lines = state.calculator.rollEntries.map((entry) => calculatorValueToDisplayString(entry.y));
  return { lines, lineCount: lines.length };
};

const buildSlotView = (state: GameState): string => {
  const slotCount = state.calculator.operationSlots.length;
  const draftSuffix = state.calculator.draftingSlot ? "+draft" : "";
  return `slots:${slotCount.toString()}${draftSuffix}`;
};

const buildUnlockReadModel = (state: GameState): Array<{ id: string; done: boolean }> =>
  state.completedUnlockIds.map((id) => ({ id, done: true }));

export const buildReadModel = (state: GameState): DomainReadModel => ({
  graphPoints: buildGraphPoints(state.calculator.rollEntries),
  totalDisplay: calculatorValueToDisplayString(state.calculator.total),
  rollView: buildRollView(state),
  slotView: buildSlotView(state),
  unlockRows: buildUnlockReadModel(state),
  graphVisible: buildGraphPoints(state.calculator.rollEntries).length > 0,
});
