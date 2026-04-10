import {
  calculatorValueToDisplayString,
  isComplexCalculatorValue,
  isRationalCalculatorValue,
  isRealEquivalentCalculatorValue,
  scalarValueToCalculatorValue,
} from "../../../domain/calculatorValue.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import type { CalculatorValue, GameState } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import { applyUxRoleAttributes, buildTotalHintRowsViewModel, resolveTotalHintRowUxAssignment } from "../../shared/readModel.js";
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

const getComplexToken = (unlockedDigits: number): string =>
  unlockedDigits >= 4 ? "CIRC" : unlockedDigits === 3 ? "CIR" : unlockedDigits === 2 ? "CI" : "C";

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
  I: ["b", "c"],
  R: ["e", "g"],
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
  radix: number,
  options: {
    fractionAsToken?: boolean;
  } = {},
): void => {
  const displayValue = (
    value.kind === "complex" && isRealEquivalentCalculatorValue(value)
      ? scalarValueToCalculatorValue(value.value.re)
      : value
  );
  const fractionAsToken = options.fractionAsToken ?? true;
  const rationalValue = isRationalCalculatorValue(displayValue) ? displayValue.value : null;
  const isNaNValue = displayValue.kind === "nan";
  const isComplexValue = isComplexCalculatorValue(displayValue);
  const hasRationalValue = rationalValue !== null;
  const hasIntegerValue = hasRationalValue && rationalValue.den === 1n;
  const isNegative =
    hasIntegerValue && (rationalValue.num < 0n || (rationalValue.num === 0n && pendingNegative));

  if (isNaNValue) {
    appendSevenSegmentFrame(target, buildTokenSlotModel(getNanToken(unlockedDigits), unlockedDigits));
    return;
  }
  if (isComplexValue) {
    appendSevenSegmentFrame(target, buildTokenSlotModel(getComplexToken(unlockedDigits), unlockedDigits));
    return;
  }
  if (!hasRationalValue) {
    const symbolic = document.createElement("div");
    symbolic.className = "seg-fraction";
    symbolic.textContent = calculatorValueToDisplayString(displayValue);
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

  const slotModels = buildTotalSlotModel(displayValue, unlockedDigits, radix);

  const firstActiveIndex = slotModels.findIndex((slot) => slot.state === "active");
  const signSlotIndex = isNegative && firstActiveIndex > 0 ? firstActiveIndex - 1 : -1;
  const signedSlotModels = slotModels.map((slot, index) =>
    index === signSlotIndex
      ? { ...slot, state: "active" as const, activeSegments: ["g"] as const }
      : slot);
  appendSevenSegmentFrame(target, signedSlotModels);
};

export const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const binaryModeEnabled = state.settings.base === "base2";
  const displayRadix = binaryModeEnabled ? 2 : 10;
  const latestRollEntry = state.calculator.rollEntries.at(-1);
  const shouldDisplayAlgLabel = latestRollEntry?.error?.kind === "symbolic_result";
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
  const hintRows = buildTotalHintRowsViewModel(state);
  const hintStrip = document.createElement("div");
  hintStrip.className = "total-hint-strip";
  for (const hintRow of hintRows) {
    const row = document.createElement("div");
    row.className = "total-hint-row";
    applyUxRoleAttributes(row, resolveTotalHintRowUxAssignment(hintRow));
    const label = document.createElement("span");
    label.className = "total-hint-label";
    applyUxRoleAttributes(label, resolveTotalHintRowUxAssignment(hintRow));
    label.textContent = hintRow.label;
    const value = document.createElement("span");
    value.className = "total-hint-value";
    applyUxRoleAttributes(value, resolveTotalHintRowUxAssignment(hintRow));
    value.textContent = hintRow.value;
    row.append(label, value);
    hintStrip.appendChild(row);
  }
  primaryDisplay.appendChild(hintStrip);
  const baseIndicator = document.createElement("span");
  baseIndicator.className = "total-base-indicator";
  baseIndicator.textContent = binaryModeEnabled ? "| BIN |" : "";
  baseIndicator.setAttribute("aria-hidden", binaryModeEnabled ? "false" : "true");
  primaryDisplay.appendChild(baseIndicator);
  primaryDisplay.appendChild(domainIndicator);
  if (shouldRenderClearedPlaceholder) {
    const slotModels = buildClearedTotalSlotModel(state.unlocks.maxTotalDigits);
    appendSevenSegmentFrame(primaryDisplay, slotModels);
    stack.appendChild(primaryDisplay);
    totalEl.appendChild(stack);
    totalEl.setAttribute("aria-label", "Total _");
    return;
  }
  const defaultDisplayLabel = (() => {
    const displayValue = (
      state.calculator.total.kind === "complex" && isRealEquivalentCalculatorValue(state.calculator.total)
        ? scalarValueToCalculatorValue(state.calculator.total.value.re)
        : state.calculator.total
    );
    if (shouldDisplayAlgLabel) {
      return "ALG";
    }
    if (isComplexCalculatorValue(displayValue)) {
      return "complex";
    }
    if (binaryModeEnabled && displayValue.kind === "rational" && displayValue.value.den === 1n) {
      return displayValue.value.num.toString(2);
    }
    return calculatorValueToDisplayString(displayValue);
  })();
  totalEl.setAttribute("aria-label", `Total ${defaultDisplayLabel}`);
  renderSevenSegmentValue(
    primaryDisplay,
    state.calculator.total,
    state.unlocks.maxTotalDigits,
    state.calculator.pendingNegativeTotal,
    displayRadix,
  );
  stack.appendChild(primaryDisplay);
  totalEl.appendChild(stack);
};
