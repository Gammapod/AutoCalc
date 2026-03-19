import { calculatorValueToDisplayString, isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import { getLambdaDerivedValues, getLambdaUnusedPoints } from "../../../domain/lambdaControl.js";
import { getEffectiveControlProfile } from "../../../domain/controlProfileRuntime.js";
import type { CalculatorValue, GameState } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import {
  buildClearedTotalSlotModel,
  buildTotalSlotModel,
  isClearedCalculatorState,
  type SegmentName,
  type TotalSlotModel,
} from "./viewModel.js";

const SEGMENT_NAMES: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];
const MAX_TOTAL_DISPLAY_SLOTS = 12;

const getNanToken = (unlockedDigits: number): string =>
  unlockedDigits >= 3 ? "Err" : unlockedDigits === 2 ? "Er" : "E";

const getFractionToken = (unlockedDigits: number): string =>
  unlockedDigits >= 4 ? "FrAC" : unlockedDigits === 3 ? "FrC" : unlockedDigits === 2 ? "Fr" : "F";

const TOKEN_SEGMENTS: Record<string, readonly SegmentName[]> = {
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
  "-": ["g"],
  "=": ["d", "g"],
  E: ["a", "d", "e", "f", "g"],
  r: ["e", "g"],
  F: ["a", "e", "f", "g"],
  A: ["a", "b", "c", "e", "f", "g"],
  C: ["a", "d", "e", "f"],
};

const clampUnlockedDigits = (value: number): number =>
  Math.max(1, Math.min(MAX_TOTAL_DISPLAY_SLOTS, value));

const buildTokenSlotModel = (token: string, unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_TOTAL_DISPLAY_SLOTS - clampedUnlocked;
  const glyphs = Array.from(token).slice(0, clampedUnlocked);
  const leadingUnlockedCount = clampedUnlocked - glyphs.length;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_TOTAL_DISPLAY_SLOTS; index += 1) {
    if (index < lockedCount) {
      slots.push({ state: "locked", digit: null, activeSegments: [] });
      continue;
    }

    const unlockedIndex = index - lockedCount;
    if (unlockedIndex < leadingUnlockedCount) {
      slots.push({ state: "unlocked", digit: null, activeSegments: [] });
      continue;
    }

    const glyph = glyphs[unlockedIndex - leadingUnlockedCount] ?? "";
    slots.push({
      state: "active",
      digit: glyph,
      activeSegments: TOKEN_SEGMENTS[glyph] ?? [],
    });
  }

  return slots;
};

const appendSevenSegmentFrame = (target: HTMLElement, slotModels: readonly TotalSlotModel[]): void => {
  const frame = document.createElement("div");
  frame.className = "seg-frame";
  frame.style.gridTemplateColumns = `repeat(${slotModels.length.toString()}, max-content)`;

  for (const slot of slotModels) {
    const digitEl = document.createElement("div");
    digitEl.className = `seg-digit seg-digit--${slot.state}`;
    for (const segmentName of SEGMENT_NAMES) {
      const segmentEl = document.createElement("div");
      segmentEl.className = `seg seg-${segmentName}`;
      if (slot.state === "active" && slot.activeSegments.includes(segmentName)) {
        segmentEl.classList.add("seg--on");
      }
      digitEl.appendChild(segmentEl);
    }
    frame.appendChild(digitEl);
  }

  target.appendChild(frame);
};

const buildLiteralSegmentSlotModel = (value: string): TotalSlotModel[] =>
  Array.from(value).map((glyph) => ({
    state: "active",
    digit: glyph,
    activeSegments: TOKEN_SEGMENTS[glyph] ?? [],
  }));

const renderSevenSegmentValue = (
  target: HTMLElement,
  value: CalculatorValue,
  unlockedDigits: number,
  pendingNegative: boolean,
  options: {
    fractionAsToken?: boolean;
  } = {},
): void => {
  const fractionAsToken = options.fractionAsToken ?? true;
  const rationalValue = isRationalCalculatorValue(value) ? value.value : null;
  const isNaNValue = value.kind === "nan";
  const hasRationalValue = rationalValue !== null;
  const hasIntegerValue = hasRationalValue && rationalValue.den === 1n;
  const isNegative =
    hasIntegerValue && (rationalValue.num < 0n || (rationalValue.num === 0n && pendingNegative));

  if (isNaNValue) {
    appendSevenSegmentFrame(target, buildTokenSlotModel(getNanToken(unlockedDigits), unlockedDigits));
    return;
  }
  if (!hasRationalValue) {
    const symbolic = document.createElement("div");
    symbolic.className = "seg-fraction";
    symbolic.textContent = calculatorValueToDisplayString(value);
    target.appendChild(symbolic);
    return;
  }

  if (!hasIntegerValue) {
    if (fractionAsToken) {
      appendSevenSegmentFrame(target, buildTokenSlotModel(getFractionToken(unlockedDigits), unlockedDigits));
      return;
    }
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = toDisplayString(rationalValue);
    target.appendChild(fraction);
    return;
  }

  const slotModels = buildTotalSlotModel(value, unlockedDigits);

  const firstActiveIndex = slotModels.findIndex((slot) => slot.state === "active");
  const signSlotIndex = isNegative && firstActiveIndex > 0 ? firstActiveIndex - 1 : -1;
  const signedSlotModels = slotModels.map((slot, index) =>
    index === signSlotIndex
      ? { ...slot, state: "active" as const, activeSegments: ["g"] as const }
      : slot);
  appendSevenSegmentFrame(target, signedSlotModels);
};

export const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const profile = getEffectiveControlProfile(state);
  const lambdaDerived = getLambdaDerivedValues(state.lambdaControl, profile);
  const buildMemoryStatusRow = (): HTMLElement => {
    const row = document.createElement("div");
    row.className = "total-memory-row";

    const lambda = document.createElement("span");
    lambda.className = "total-memory-lambda";
    lambda.textContent = `\u03BB = ${getLambdaUnusedPoints(state.lambdaControl, profile).toString()}`;
    row.appendChild(lambda);

    const variables = document.createElement("div");
    variables.className = "total-memory-variables";
    const variableValues: Array<{ symbol: "\u03B1" | "\u03B2" | "\u03B3" | "\u03B4" | "\u03F5"; value: string }> = [
      { symbol: "\u03B1", value: state.lambdaControl.alpha.toString() },
      { symbol: "\u03B2", value: state.lambdaControl.beta.toString() },
      { symbol: "\u03B3", value: state.lambdaControl.gamma.toString() },
      { symbol: "\u03B4", value: lambdaDerived.deltaEffective.toString() },
      { symbol: "\u03F5", value: toDisplayString(lambdaDerived.epsilonEffective) },
    ];
    for (const entry of variableValues) {
      const token = document.createElement("span");
      token.className = "total-memory-var";
      const isSelected = entry.symbol === "\u03B1" || entry.symbol === "\u03B2" || entry.symbol === "\u03B3"
        ? state.ui.memoryVariable === entry.symbol
        : false;
      const leftBracket = document.createElement("span");
      leftBracket.className = isSelected
        ? "total-memory-bracket total-memory-bracket--visible"
        : "total-memory-bracket";
      leftBracket.textContent = "[";
      const symbol = document.createElement("span");
      symbol.className = isSelected ? "total-memory-symbol total-memory-symbol--selected" : "total-memory-symbol";
      symbol.textContent = entry.symbol;
      const rightBracket = document.createElement("span");
      rightBracket.className = isSelected
        ? "total-memory-bracket total-memory-bracket--visible"
        : "total-memory-bracket";
      rightBracket.textContent = "]";
      const valueText = document.createElement("span");
      valueText.className = "total-memory-value";
      valueText.textContent = ` = ${entry.value}`;
      token.append(leftBracket, symbol, rightBracket, valueText);
      variables.appendChild(token);
    }
    row.appendChild(variables);
    return row;
  };

  const latestRollEntry = state.calculator.rollEntries.at(-1);
  const latestErrorCode = latestRollEntry?.error?.code;
  const shouldDisplayAlgLabel = latestErrorCode === "ALG";
  const domainValue = latestRollEntry?.y ?? state.calculator.total;
  const totalIsNaN = state.calculator.total.kind === "nan";
  const hasLatestRollError = Boolean(state.calculator.rollEntries.at(-1)?.error);
  const hasAnyKeyPress = Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);
  const shouldRenderClearedPlaceholder =
    isClearedCalculatorState(state.calculator) && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress);
  totalEl.classList.toggle("total-display--error", hasLatestRollError);
  totalEl.innerHTML = "";
  const stack = document.createElement("div");
  stack.className = "total-display-stack";
  const metaRow = document.createElement("div");
  metaRow.className = "total-meta-row";
  const domainIndicator = document.createElement("span");
  domainIndicator.className = "total-domain-indicator";
  if (shouldRenderClearedPlaceholder) {
    domainIndicator.textContent = "";
    domainIndicator.setAttribute("aria-hidden", "true");
  } else {
    domainIndicator.textContent = totalIsNaN ? "\u2205" : getRollYDomain(domainValue);
    domainIndicator.setAttribute("aria-hidden", "false");
  }
  domainIndicator.classList.toggle("total-domain-indicator--nan", totalIsNaN && !shouldRenderClearedPlaceholder);
  domainIndicator.classList.add("total-domain-indicator--inline");

  const remainderDisplay = document.createElement("div");
  remainderDisplay.className = "total-remainder-display";
  if (latestRollEntry?.remainder) {
    remainderDisplay.setAttribute("aria-hidden", "false");
    const remainderToken = latestRollEntry.remainder.den === 1n
      ? latestRollEntry.remainder.num.toString()
      : "FrAC";
    appendSevenSegmentFrame(remainderDisplay, buildLiteralSegmentSlotModel(`r=${remainderToken}`));
  } else {
    remainderDisplay.setAttribute("aria-hidden", "true");
  }
  metaRow.appendChild(remainderDisplay);
  stack.appendChild(metaRow);

  const primaryDisplay = document.createElement("div");
  primaryDisplay.className = "total-primary-display";
  primaryDisplay.appendChild(domainIndicator);
  if (shouldRenderClearedPlaceholder) {
    const slotModels = buildClearedTotalSlotModel(state.unlocks.maxTotalDigits);
    appendSevenSegmentFrame(primaryDisplay, slotModels);
    stack.appendChild(primaryDisplay);
    stack.appendChild(buildMemoryStatusRow());
    totalEl.appendChild(stack);
    totalEl.setAttribute("aria-label", "Total _");
    return;
  }
  totalEl.setAttribute("aria-label", `Total ${shouldDisplayAlgLabel ? "ALG" : calculatorValueToDisplayString(state.calculator.total)}`);
  renderSevenSegmentValue(
    primaryDisplay,
    state.calculator.total,
    state.unlocks.maxTotalDigits,
    state.calculator.pendingNegativeTotal,
  );
  stack.appendChild(primaryDisplay);
  stack.appendChild(buildMemoryStatusRow());
  totalEl.appendChild(stack);
};
