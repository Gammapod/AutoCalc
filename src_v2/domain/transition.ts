import { initialState } from "../../src/domain/state.js";
import { applyKeyAction } from "../../src/domain/reducer.input.js";
import {
  applyMoveKeySlot,
  applyMoveLayoutCell,
  applySetKeypadDimensions,
  applyUpgradeKeypadColumn,
  applyUpgradeKeypadRow,
  applySwapKeySlots,
  applySwapLayoutCells,
} from "../../src/domain/reducer.layout.js";
import { applyLifecycleAction } from "../../src/domain/reducer.lifecycle.js";
import { applyToggleFlag } from "../../src/domain/reducer.flags.js";
import type { GameState } from "../../src/domain/types.js";
import { actionFromEvent, type DomainEvent } from "./events.js";

const applyLegacySemantics = (state: GameState, event: DomainEvent): GameState => {
  const action = actionFromEvent(event);
  if (action.type === "PRESS_KEY") {
    return applyKeyAction(state, action.key);
  }

  const lifecycleHandled = applyLifecycleAction(state, action);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  if (action.type === "MOVE_KEY_SLOT") {
    return applyMoveKeySlot(state, action.fromIndex, action.toIndex);
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    return applySwapKeySlots(state, action.firstIndex, action.secondIndex);
  }
  if (action.type === "MOVE_LAYOUT_CELL") {
    const moved = applyMoveLayoutCell(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (moved !== state && action.fromSurface !== action.toSurface) {
      return applyKeyAction(moved, "C");
    }
    return moved;
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    const swapped = applySwapLayoutCells(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (swapped !== state && action.fromSurface !== action.toSurface) {
      return applyKeyAction(swapped, "C");
    }
    return swapped;
  }
  if (action.type === "SET_KEYPAD_DIMENSIONS") {
    return applySetKeypadDimensions(state, action.columns, action.rows);
  }
  if (action.type === "UPGRADE_KEYPAD_ROW") {
    return applyUpgradeKeypadRow(state);
  }
  if (action.type === "UPGRADE_KEYPAD_COLUMN") {
    return applyUpgradeKeypadColumn(state);
  }
  if (action.type === "TOGGLE_FLAG") {
    return applyToggleFlag(state, action.flag);
  }
  return state;
};

export const applyEvent = (state: GameState | undefined, event: DomainEvent): GameState =>
  applyLegacySemantics(state ?? initialState(), event);
