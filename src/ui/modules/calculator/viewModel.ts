import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { getExecutionStageCount, resolveWrapStageMode } from "../../../domain/executionPlan.js";
import { resolveFormulaSymbol } from "../../../domain/multiCalculator.js";
import type { CalculatorValue, CalculatorState, GameState, RollEntry } from "../../../domain/types.js";
import {
  buildOperationSlotDisplay as buildOperationSlotDisplayShared,
  buildRollLines as buildRollLinesShared,
  buildRollRows as buildRollRowsShared,
  buildRollViewModel as buildRollViewModelShared,
  formatKeyLabel as formatKeyLabelShared,
  type RollRow,
  type RollViewModel,
} from "../../shared/readModel.js";

const MAX_UNLOCKED_TOTAL_DIGITS = 12;
const DIGIT_SEGMENTS: Record<string, readonly ["a" | "b" | "c" | "d" | "e" | "f" | "g", ...("a" | "b" | "c" | "d" | "e" | "f" | "g")[]] | []> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "d", "e", "g"],
  "3": ["a", "b", "c", "d", "g"],
  "4": ["b", "c", "f", "g"],
  "5": ["a", "c", "d", "f", "g"],
  "6": ["a", "c", "d", "e", "f", "g"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

export type SegmentName = "a" | "b" | "c" | "d" | "e" | "f" | "g";

export type TotalSlotModel = {
  state: "locked" | "unlocked" | "active";
  digit: string | null;
  activeSegments: readonly SegmentName[];
};

const clampUnlockedDigits = (value: number): number =>
  Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, value));

export const buildTotalSlotModel = (total: CalculatorValue, unlockedDigits: number, radix: number = 10): TotalSlotModel[] => {
  const numericTotal = isRationalCalculatorValue(total) ? total.value : { num: 0n, den: 1n };
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const magnitude = numericTotal.num < 0n ? -numericTotal.num : numericTotal.num;
  const safeRadix = Math.max(2, Math.trunc(radix));
  const renderedDigits = magnitude.toString(safeRadix).slice(-clampedUnlocked);
  const leadingUnlockedCount = clampedUnlocked - renderedDigits.length;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_UNLOCKED_TOTAL_DIGITS; index += 1) {
    if (index < lockedCount) {
      slots.push({
        state: "locked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const unlockedIndex = index - lockedCount;
    if (unlockedIndex < leadingUnlockedCount) {
      slots.push({
        state: "unlocked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const digit = renderedDigits[unlockedIndex - leadingUnlockedCount];
    slots.push({
      state: "active",
      digit,
      activeSegments: DIGIT_SEGMENTS[digit] ?? [],
    });
  }

  return slots;
};

export const buildClearedTotalSlotModel = (unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_UNLOCKED_TOTAL_DIGITS; index += 1) {
    if (index < lockedCount) {
      slots.push({
        state: "locked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    slots.push({
      state: "unlocked",
      digit: null,
      activeSegments: [],
    });
  }

  if (slots.length > 0) {
    slots[slots.length - 1] = {
      state: "active",
      digit: "_",
      activeSegments: ["d"],
    };
  }

  return slots;
};

export const isClearedCalculatorState = (calculator: CalculatorState): boolean =>
  isRationalCalculatorValue(calculator.total) &&
  calculator.total.value.num === 0n &&
  calculator.total.value.den === 1n &&
  !calculator.pendingNegativeTotal &&
  calculator.rollEntries.length === 0 &&
  calculator.operationSlots.length === 0 &&
  calculator.draftingSlot === null;

export const buildRollLines = (rollEntries: RollEntry[]): string[] => {
  return buildRollLinesShared(rollEntries);
};

export const buildRollRows = (rollEntries: RollEntry[]): RollRow[] => {
  return buildRollRowsShared(rollEntries);
};

export const buildRollViewModel = (rollEntries: RollEntry[]): RollViewModel => {
  return buildRollViewModelShared(rollEntries);
};

export const getRollLineClassName = (row: RollRow): string =>
  row.remainder || row.errorCode ? "roll-line roll-line--with-remainder" : "roll-line";

const DELTA_WRAP_SUFFIX = " [ + \u{1D6FF} \u27E1 2\u{1D6FF} \u2212 \u{1D6FF} ]";
const MOD_ZERO_TO_DELTA_SUFFIX = " [ \u27E1 \u{1D6FF} ]";

export type OperationSlotDisplayModel = {
  base: string;
  displayFunctionBase: string;
  fixedSeedLabel: string;
  deltaWrapSuffix: string | null;
  stepTargetTokenIndex: number | null;
};

const toFunctionBuilderDisplayParts = (
  base: string,
  symbol: "f" | "g",
): { displayFunctionBase: string; fixedSeedLabel: string } => {
  const sym = symbol === "g" ? "g" : "f";
  const seedPrefix = `${sym}\u2080`;
  const functionPrefix = symbol === "g" ? `${sym}\u2093 = ${sym}\u2093\u208B\u2081` : `${sym}\u2093 = ${sym}\u2080`;
  if (base === "(no operation slots)") {
    return { displayFunctionBase: functionPrefix, fixedSeedLabel: `| ${seedPrefix} = _` };
  }
  const firstTokenStart = base.indexOf(" [");
  const seedToken = firstTokenStart < 0 ? base.trim() : base.slice(0, firstTokenStart).trim();
  const slotTokens = firstTokenStart < 0 ? "" : base.slice(firstTokenStart).trim();
  return {
    displayFunctionBase: slotTokens ? `${functionPrefix} ${slotTokens}` : functionPrefix,
    fixedSeedLabel: `| ${seedPrefix} = ${seedToken || "_"}`,
  };
};

const withDisplayParts = (
  base: string,
  symbol: "f" | "g",
  deltaWrapSuffix: string | null,
  stepTargetTokenIndex: number | null,
): OperationSlotDisplayModel => {
  const parts = toFunctionBuilderDisplayParts(base, symbol);
  return {
    base,
    displayFunctionBase: parts.displayFunctionBase,
    fixedSeedLabel: parts.fixedSeedLabel,
    deltaWrapSuffix,
    stepTargetTokenIndex,
  };
};

export const buildOperationSlotDisplayModel = (state: GameState): OperationSlotDisplayModel => {
  const base = buildOperationSlotDisplayShared(state);
  const symbol = resolveFormulaSymbol(state);
  const operationSlotCount = state.calculator.operationSlots.length;
  const executionStageCount = getExecutionStageCount(state.calculator.operationSlots, state);
  const hasWrapStage = resolveWrapStageMode(state) !== null;
  const stepExpansionEnabled = state.settings.stepExpansion === "on";
  const stepThroughOnKeypad = state.ui.keyLayout.some(
    (cell) => cell.kind === "key" && cell.key === "exec_step_through",
  );
  const stepTargetStageIndex =
    (stepThroughOnKeypad || stepExpansionEnabled) && executionStageCount > 0
      ? state.calculator.stepProgress.active
        ? (
            state.calculator.stepProgress.nextSlotIndex >= 0
            && state.calculator.stepProgress.nextSlotIndex < executionStageCount
              ? state.calculator.stepProgress.nextSlotIndex
              : null
          )
        : 0
      : null;
  const stepTargetTokenIndex = stepTargetStageIndex === null
    ? null
    : stepTargetStageIndex < operationSlotCount
      ? stepTargetStageIndex
      : hasWrapStage
        ? operationSlotCount
        : null;
  const deltaWrapEnabled = state.settings.wrapper === "delta_range_clamp";
  const modZeroToDeltaEnabled = state.settings.wrapper === "mod_zero_to_delta";
  const hasNoCommittedOrDraftedSlots = operationSlotCount === 0 && state.calculator.draftingSlot === null;
  if (modZeroToDeltaEnabled) {
    if (hasNoCommittedOrDraftedSlots) {
      return withDisplayParts("_ [ \u27E1 \u{1D6FF} ]", symbol, null, stepTargetTokenIndex);
    }
    return withDisplayParts(base, symbol, MOD_ZERO_TO_DELTA_SUFFIX, stepTargetTokenIndex);
  }
  if (deltaWrapEnabled) {
    if (hasNoCommittedOrDraftedSlots) {
      return withDisplayParts("_ [ + \u{1D6FF} \u27E1 2\u{1D6FF} - \u{1D6FF} ]", symbol, null, stepTargetTokenIndex);
    }
    return withDisplayParts(base, symbol, DELTA_WRAP_SUFFIX, stepTargetTokenIndex);
  }
  return withDisplayParts(base, symbol, null, stepTargetTokenIndex);
};

export const buildOperationSlotDisplay = (state: GameState): string => {
  const display = buildOperationSlotDisplayModel(state);
  return `${display.base}${display.deltaWrapSuffix ?? ""}`;
};

export const formatKeyLabel = formatKeyLabelShared;
export { formatKeyCellLabel } from "../calculatorStorageCore.js";
