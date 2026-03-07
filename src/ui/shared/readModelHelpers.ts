import type { CalculatorValue, RollEntry } from "../../domain/types.js";
import {
  buildGraphPoints as buildGraphPointsCanonical,
  isGraphRenderable,
} from "../modules/visualizers/graphModel.js";
export {
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildVisibleChecklistRows,
  buildUnlockRows,
  formatKeyLabel,
  formatOperatorForDisplay,
  getKeyVisualGroup,
} from "./readModel.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "remainder";
  hasError: boolean;
};

export const buildGraphPoints = (
  rollEntries: RollEntry[],
  seedSnapshot?: CalculatorValue,
): GraphPoint[] => buildGraphPointsCanonical(rollEntries, seedSnapshot);

export const isGraphVisible = (rollEntries: RollEntry[]): boolean => isGraphRenderable(rollEntries);
