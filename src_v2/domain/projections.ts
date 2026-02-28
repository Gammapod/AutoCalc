import { toDisplayString } from "../../src/infra/math/rationalEngine.js";
import {
  buildGraphPoints,
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildUnlockRows,
  isGraphVisible,
} from "../../src/ui/render.js";
import { unlockCatalog } from "../../src/content/unlocks.catalog.js";
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
  totalDisplay: toDisplayString(state.calculator.total),
  rollView: buildRollViewModel(state.calculator.roll, state.calculator.euclidRemainders),
  slotView: buildOperationSlotDisplay(state),
  unlockRows: buildUnlockRows(state, unlockCatalog),
  graphPoints: buildGraphPoints(state.calculator.roll),
  graphVisible: isGraphVisible(state.calculator.roll),
});
