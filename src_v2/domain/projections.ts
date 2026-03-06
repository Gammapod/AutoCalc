import { toDisplayString } from "../../src/infra/math/rationalEngine.js";
import {
  buildGraphPoints,
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildUnlockRows,
  isGraphVisible,
} from "../ui/shared/readModelHelpers.js";
import type { GameState } from "../../src/domain/types.js";

export type DomainReadModel = {
  totalDisplay: string;
  rollView: ReturnType<typeof buildRollViewModel>;
  slotView: string;
  unlockRows: ReturnType<typeof buildUnlockRows>;
  graphPoints: ReturnType<typeof buildGraphPoints>;
  graphVisible: boolean;
};

export const buildReadModel = (state: GameState): DomainReadModel => ({
  totalDisplay: state.calculator.total.kind === "nan" ? "NaN" : toDisplayString(state.calculator.total.value),
  rollView: buildRollViewModel(state.calculator.rollEntries),
  slotView: buildOperationSlotDisplay(state),
  unlockRows: buildUnlockRows(state),
  graphPoints: buildGraphPoints(state.calculator.rollEntries),
  graphVisible: isGraphVisible(state.calculator.rollEntries),
});
