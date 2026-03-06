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
  // Match grapher seed semantics: prefer captured seed, else current total before first roll entry.
  graphPoints: buildGraphPoints(
    state.calculator.rollEntries,
    state.calculator.seedSnapshot ?? (state.calculator.rollEntries.length === 0 ? state.calculator.total : undefined),
  ),
  totalDisplay: state.calculator.total.kind === "nan" ? "NaN" : toDisplayString(state.calculator.total.value),
  rollView: buildRollViewModel(state.calculator.rollEntries),
  slotView: buildOperationSlotDisplay(state),
  unlockRows: buildUnlockRows(state),
  graphVisible: isGraphVisible(state.calculator.rollEntries),
});
