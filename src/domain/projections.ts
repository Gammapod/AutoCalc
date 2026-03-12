import { calculatorValueToDisplayString } from "./calculatorValue.js";
import {
  buildGraphPoints,
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildUnlockRows,
  isGraphVisible,
} from "../ui/shared/readModelHelpers.js";
import type { GameState } from "./types.js";

export type DomainReadModel = {
  totalDisplay: string;
  rollView: ReturnType<typeof buildRollViewModel>;
  slotView: string;
  unlockRows: ReturnType<typeof buildUnlockRows>;
  graphPoints: ReturnType<typeof buildGraphPoints>;
  graphVisible: boolean;
};

export const buildReadModel = (state: GameState): DomainReadModel => ({
  graphPoints: buildGraphPoints(state.calculator.rollEntries),
  totalDisplay: calculatorValueToDisplayString(state.calculator.total),
  rollView: buildRollViewModel(state.calculator.rollEntries),
  slotView: buildOperationSlotDisplay(state),
  unlockRows: buildUnlockRows(state),
  graphVisible: isGraphVisible(state.calculator.rollEntries),
});
