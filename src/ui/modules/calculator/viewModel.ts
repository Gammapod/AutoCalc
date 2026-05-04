import { calculatorValueToDisplayParts, isRationalCalculatorValue, type CalculatorDisplayPart } from "../../../domain/calculatorValue.js";
import { getExecutionStageCount, resolveWrapStageMode } from "../../../domain/executionPlan.js";
import type { WrapStageMode } from "../../../domain/executionPlanIR.js";
import { resolveFormulaSymbol } from "../../../domain/multiCalculator.js";
import { getSeedRow } from "../../../domain/rollEntries.js";
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
  row.errorCode ? "roll-line roll-line--with-remainder" : "roll-line";

const toSuperscript = (source: string): string => source
  .split("")
  .map((char) => {
    if (char === "0") {
      return "\u2070";
    }
    if (char === "1") {
      return "\u00B9";
    }
    if (char === "2") {
      return "\u00B2";
    }
    if (char === "3") {
      return "\u00B3";
    }
    if (char === "4") {
      return "\u2074";
    }
    if (char === "5") {
      return "\u2075";
    }
    if (char === "6") {
      return "\u2076";
    }
    if (char === "7") {
      return "\u2077";
    }
    if (char === "8") {
      return "\u2078";
    }
    if (char === "9") {
      return "\u2079";
    }
    if (char === "-") {
      return "\u207B";
    }
    return char;
  })
  .join("");

const formatWrapBoundaryExpr = (state: GameState): string => {
  const radix = state.settings.base === "base2" ? 2 : 10;
  const delta = state.unlocks.maxTotalDigits;
  return `${radix.toString()}${toSuperscript(delta.toString())}${toSuperscript("-1")}`;
};

const BINARY_OCTAVE_CYCLE_DISPLAY = "--> [A0,A8)";

export type OperationSlotDisplayModel = {
  base: string;
  displayFunctionBase: string;
  fixedSeedLabel: string;
  fixedSeedParts: CalculatorDisplayPart[];
  functionPrefix: string;
  seedToken: FunctionBarSeedToken;
  slotTokens: FunctionBarSlotToken[];
  executableSlotCount: number;
  wrapTail: FunctionBarWrapTailToken | null;
  deltaWrapSuffix: string | null;
  stepTargetTokenIndex: number | null;
};

export type FunctionBarSeedToken = {
  kind: "seed";
  text: string;
  parts: CalculatorDisplayPart[];
};

export type FunctionBarSlotToken = {
  kind: "slot";
  text: string;
  parts: CalculatorDisplayPart[];
};

export type FunctionBarWrapTailToken = {
  kind: "wrapTail";
  mode: WrapStageMode;
  fullText: string;
  compactText: string;
  iconText: string;
  ariaLabel: string;
};

const parseSeedAndSlotTokensFromBase = (
  base: string,
): { seedTokenText: string; slotTokenTexts: string[] } => {
  const trimmed = base.trim();
  if (trimmed.length === 0 || trimmed === "(no operation slots)") {
    return { seedTokenText: "_", slotTokenTexts: [] };
  }
  const firstTokenStart = trimmed.indexOf("[");
  const seedTokenText = (firstTokenStart < 0 ? trimmed : trimmed.slice(0, firstTokenStart)).trim() || "_";
  const slotTokenTexts = trimmed.match(/\[[^\]]*\]/g) ?? [];
  return { seedTokenText, slotTokenTexts };
};

const toWrapTailToken = (
  state: GameState,
  mode: WrapStageMode,
): FunctionBarWrapTailToken => {
  if (mode === "delta_range_clamp") {
    const boundary = formatWrapBoundaryExpr(state);
    const full = `--> [-${boundary},${boundary})`;
    return {
      kind: "wrapTail",
      mode,
      fullText: full,
      compactText: `[-${boundary},${boundary})`,
      iconText: "[\u2013,+)",
      ariaLabel: full,
    };
  }
  if (mode === "mod_zero_to_delta") {
    const boundary = formatWrapBoundaryExpr(state);
    const full = `--> [0,${boundary})`;
    return {
      kind: "wrapTail",
      mode,
      fullText: full,
      compactText: `[0,${boundary})`,
      iconText: "[0,+)",
      ariaLabel: full,
    };
  }
  const full = BINARY_OCTAVE_CYCLE_DISPLAY;
  return {
    kind: "wrapTail",
    mode,
    fullText: full,
    compactText: "[A0,A8)",
    iconText: "\u{1D106}",
    ariaLabel: full,
  };
};

const toFunctionBuilderDisplayParts = (
  base: string,
  symbol: string,
  seedParts: CalculatorDisplayPart[],
  slotTokenParts: readonly CalculatorDisplayPart[][],
): {
    functionPrefix: string;
    seedToken: FunctionBarSeedToken;
    slotTokens: FunctionBarSlotToken[];
    displayFunctionBase: string;
    fixedSeedLabel: string;
    fixedSeedParts: CalculatorDisplayPart[];
  } => {
  const seedPrefix = `${symbol}\u2080`;
  const functionPrefix = `${symbol}\u2093 = ${symbol}\u2093\u208B\u2081`;
  const parsed = parseSeedAndSlotTokensFromBase(base);
  const seedToken: FunctionBarSeedToken = {
    kind: "seed",
    text: parsed.seedTokenText,
    parts: seedParts.length > 0 ? seedParts : [{ text: parsed.seedTokenText }],
  };
  const slotTokens = parsed.slotTokenTexts.map<FunctionBarSlotToken>((text, index) => ({
    kind: "slot",
    text,
    parts: slotTokenParts[index] && slotTokenParts[index]!.length > 0 ? slotTokenParts[index]! : [{ text }],
  }));
  const slotTokenText = slotTokens.map((token) => token.text).join(" ");
  const displayFunctionBase = slotTokenText ? `${functionPrefix} ${slotTokenText}` : functionPrefix;
  return {
    functionPrefix,
    seedToken,
    slotTokens,
    displayFunctionBase,
    fixedSeedLabel: `| ${seedPrefix} = ${seedToken.text || "_"}`,
    fixedSeedParts: [{ text: `| ${seedPrefix} = ` }, ...seedToken.parts],
  };
};

const withDisplayParts = (
  base: string,
  symbol: string,
  seedParts: CalculatorDisplayPart[],
  slotTokenParts: readonly CalculatorDisplayPart[][],
  executableSlotCount: number,
  wrapTail: FunctionBarWrapTailToken | null,
  stepTargetTokenIndex: number | null,
): OperationSlotDisplayModel => {
  const parts = toFunctionBuilderDisplayParts(base, symbol, seedParts, slotTokenParts);
  return {
    base,
    functionPrefix: parts.functionPrefix,
    seedToken: parts.seedToken,
    slotTokens: parts.slotTokens,
    executableSlotCount,
    wrapTail,
    displayFunctionBase: parts.displayFunctionBase,
    fixedSeedLabel: parts.fixedSeedLabel,
    fixedSeedParts: parts.fixedSeedParts,
    deltaWrapSuffix: wrapTail ? ` ${wrapTail.fullText}` : null,
    stepTargetTokenIndex,
  };
};

const resolveSeedDisplayPartsForState = (state: GameState): CalculatorDisplayPart[] => {
  if (state.calculator.rollEntries.length > 0) {
    return calculatorValueToDisplayParts(getSeedRow(state.calculator.rollEntries)?.y ?? state.calculator.total);
  }
  if (isClearedCalculatorState(state.calculator)) {
    return [{ text: "_" }];
  }
  return calculatorValueToDisplayParts(state.calculator.total);
};

const wrapSlotExecutionResultParts = (value: CalculatorValue): CalculatorDisplayPart[] => [
  { text: "[ -> " },
  ...calculatorValueToDisplayParts(value),
  { text: " ]" },
];

const resolveSlotTokenDisplayPartsForState = (
  state: GameState,
  parsedSlotTokenCount: number,
): CalculatorDisplayPart[][] => {
  const parts = Array.from({ length: parsedSlotTokenCount }, () => [] as CalculatorDisplayPart[]);
  if (!state.calculator.stepProgress.active) {
    return parts;
  }
  for (let index = 0; index < state.calculator.stepProgress.executedSlotResults.length && index < parsedSlotTokenCount; index += 1) {
    const result = state.calculator.stepProgress.executedSlotResults[index];
    if (result) {
      parts[index] = wrapSlotExecutionResultParts(result);
    }
  }
  return parts;
};

export const buildOperationSlotDisplayModel = (state: GameState): OperationSlotDisplayModel => {
  const base = buildOperationSlotDisplayShared(state);
  const parsed = parseSeedAndSlotTokensFromBase(base);
  const symbol = resolveFormulaSymbol(state);
  const operationSlotCount = state.calculator.operationSlots.length;
  const executionStageCount = getExecutionStageCount(state.calculator.operationSlots, state);
  const hasWrapStage = resolveWrapStageMode(state) !== null;
  const stepExpansionEnabled = state.settings.stepExpansion === "on" && state.settings.forecast === "on";
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
  const wrapMode = resolveWrapStageMode(state);
  const wrapTail = wrapMode ? toWrapTailToken(state, wrapMode) : null;
  const slotTokenParts = resolveSlotTokenDisplayPartsForState(state, parsed.slotTokenTexts.length);
  return withDisplayParts(base, symbol, resolveSeedDisplayPartsForState(state), slotTokenParts, operationSlotCount, wrapTail, stepTargetTokenIndex);
};

export const buildOperationSlotDisplay = (state: GameState): string => {
  const display = buildOperationSlotDisplayModel(state);
  return `${display.base}${display.deltaWrapSuffix ?? ""}`;
};

export const formatKeyLabel = formatKeyLabelShared;
export { formatKeyCellLabel } from "../calculatorStorageCore.js";

