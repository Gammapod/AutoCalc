import { calculatorValueToDisplayString, isRationalCalculatorValue, toRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import { getLambdaDerivedValues, getLambdaUnusedPoints } from "../../../domain/lambdaControl.js";
import type { CalculatorValue, GameState } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import {
  buildClearedTotalSlotModel,
  buildTotalSlotModel,
  isClearedCalculatorState,
  type SegmentName,
} from "./viewModel.js";

const SEGMENT_NAMES: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];

const renderSevenSegmentValue = (
  target: HTMLElement,
  value: CalculatorValue,
  unlockedDigits: number,
  pendingNegative: boolean,
): void => {
  const rationalValue = isRationalCalculatorValue(value) ? value.value : null;
  const hasRationalValue = rationalValue !== null;
  const hasIntegerValue = hasRationalValue && rationalValue.den === 1n;
  const isNegative =
    hasIntegerValue && (rationalValue.num < 0n || (rationalValue.num === 0n && pendingNegative));

  if (isNegative) {
    const sign = document.createElement("div");
    sign.className = "seg-sign";
    sign.textContent = "-";
    target.appendChild(sign);
  }

  if (!hasRationalValue) {
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = "NaN";
    target.appendChild(fraction);
    return;
  }

  if (!hasIntegerValue) {
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = toDisplayString(rationalValue);
    target.appendChild(fraction);
    return;
  }

  const slotModels = buildTotalSlotModel(value, unlockedDigits);
  const frame = document.createElement("div");
  frame.className = "seg-frame";

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

export const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const lambdaDerived = getLambdaDerivedValues(state.lambdaControl);
  const buildMemoryStatusRow = (): HTMLElement => {
    const row = document.createElement("div");
    row.className = "total-memory-row";

    const lambda = document.createElement("span");
    lambda.className = "total-memory-lambda";
    lambda.textContent = `\u03BB = ${getLambdaUnusedPoints(state.lambdaControl).toString()}`;
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
  const domainValue = latestRollEntry?.y ?? state.calculator.total;
  const totalIsNaN = !isRationalCalculatorValue(state.calculator.total);
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
  metaRow.appendChild(domainIndicator);

  const remainderDisplay = document.createElement("div");
  remainderDisplay.className = "total-remainder-display";
  if (latestRollEntry?.remainder) {
    remainderDisplay.setAttribute("aria-hidden", "false");
    renderSevenSegmentValue(
      remainderDisplay,
      toRationalCalculatorValue(latestRollEntry.remainder),
      state.unlocks.maxTotalDigits,
      false,
    );
  } else {
    remainderDisplay.setAttribute("aria-hidden", "true");
  }
  metaRow.appendChild(remainderDisplay);
  stack.appendChild(metaRow);

  const primaryDisplay = document.createElement("div");
  primaryDisplay.className = "total-primary-display";
  if (shouldRenderClearedPlaceholder) {
    const frame = document.createElement("div");
    frame.className = "seg-frame";
    const slotModels = buildClearedTotalSlotModel(state.unlocks.maxTotalDigits);
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
    primaryDisplay.appendChild(frame);
    stack.appendChild(primaryDisplay);
    stack.appendChild(buildMemoryStatusRow());
    totalEl.appendChild(stack);
    totalEl.setAttribute("aria-label", "Total _");
    return;
  }
  totalEl.setAttribute("aria-label", `Total ${calculatorValueToDisplayString(state.calculator.total)}`);
  renderSevenSegmentValue(primaryDisplay, state.calculator.total, state.unlocks.maxTotalDigits, state.calculator.pendingNegativeTotal);
  stack.appendChild(primaryDisplay);
  stack.appendChild(buildMemoryStatusRow());
  totalEl.appendChild(stack);
};
