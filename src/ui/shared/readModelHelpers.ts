import type { RollEntry } from "../../domain/types.js";
import {
  buildGraphPoints as buildGraphPointsCanonical,
  isGraphRenderable,
} from "../modules/visualizers/graphModel.js";
export {
  buildOperationSlotDisplay,
  buildRollViewModel,
  formatKeyLabel,
  formatOperatorForDisplay,
  getKeyVisualGroup,
} from "./readModel.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "imaginary";
  hasError: boolean;
};

export const buildGraphPoints = (
  rollEntries: RollEntry[],
): GraphPoint[] => buildGraphPointsCanonical(rollEntries);

export const isGraphVisible = (rollEntries: RollEntry[]): boolean => isGraphRenderable(rollEntries);
