import {
  calculatorValueToRational,
  calculatorValueToDisplayString,
  isComplexCalculatorValue,
  isRationalCalculatorValue,
  isRealEquivalentCalculatorValue,
  scalarValueToCalculatorValue,
  toRationalCalculatorValue,
} from "../../../domain/calculatorValue.js";
import { calculatorValueEquals } from "../../../domain/rollEntries.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import type { CalculatorValue, GameState } from "../../../domain/types.js";
import {
  MAX_SEVEN_SEGMENT_SLOTS,
  SEVEN_SEGMENT_TOKEN_SEGMENTS,
  buildTokenGlyphSlots,
  clampSevenSegmentSlotCount,
  hasImaginaryRollHistory,
  resolveDisplayToken,
  resolveScalarDisplayKind,
} from "../../shared/displayPolicy.sevenSegment.js";
import { applyUxRoleAttributes, buildTotalHintRowsViewModel, resolveTotalHintRowUxAssignment } from "../../shared/readModel.js";
import {
  buildClearedTotalSlotModel,
  buildTotalSlotModel,
  isClearedCalculatorState,
  type SegmentName,
  type TotalSlotModel,
} from "./viewModel.js";

const SEGMENT_NAMES: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];
const MAX_TOTAL_DISPLAY_SLOTS = MAX_SEVEN_SEGMENT_SLOTS;

const buildTokenSlotModel = (token: string, unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampSevenSegmentSlotCount(unlockedDigits, MAX_TOTAL_DISPLAY_SLOTS);
  const lockedCount = MAX_TOTAL_DISPLAY_SLOTS - clampedUnlocked;
  const glyphs = buildTokenGlyphSlots(token, clampedUnlocked, MAX_TOTAL_DISPLAY_SLOTS);
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_TOTAL_DISPLAY_SLOTS; index += 1) {
    if (index < lockedCount) {
      slots.push({ state: "locked", digit: null, activeSegments: [] });
      continue;
    }

    const unlockedIndex = index - lockedCount;
    const glyph = glyphs[unlockedIndex] ?? null;
    if (glyph === null) {
      slots.push({ state: "unlocked", digit: null, activeSegments: [] });
      continue;
    }

    slots.push({
      state: "active",
      digit: glyph,
      activeSegments: SEVEN_SEGMENT_TOKEN_SEGMENTS[glyph] ?? [],
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

const resolveCycleAmberActive = (state: GameState): boolean => {
  if (state.settings.cycle !== "on") {
    return false;
  }
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle"
    ? state.calculator.rollAnalysis.cycle
    : null;
  if (!cycle) {
    return false;
  }
  const latestIndex = state.calculator.rollEntries.length - 1;
  if (latestIndex < 0 || latestIndex < cycle.j) {
    return false;
  }
  const latestEntry = state.calculator.rollEntries[latestIndex];
  const cycleStartEntry = state.calculator.rollEntries[cycle.i];
  if (!latestEntry || !cycleStartEntry) {
    return false;
  }
  return calculatorValueEquals(latestEntry.y, cycleStartEntry.y);
};

const renderSevenSegmentValue = (
  target: HTMLElement,
  value: CalculatorValue,
  unlockedDigits: number,
  pendingNegative: boolean,
  radix: number,
): void => {
  const displayValue = value;
  const displayKind = resolveScalarDisplayKind(displayValue);
  const token = resolveDisplayToken(displayKind);
  if (token) {
    appendSevenSegmentFrame(target, buildTokenSlotModel(token, unlockedDigits));
    return;
  }

  const rationalValue = isRationalCalculatorValue(displayValue)
    ? displayValue.value
    : displayKind !== "nan"
      ? calculatorValueToRational(displayValue)
      : null;
  if (!rationalValue || rationalValue.den !== 1n) {
    return;
  }
  const hasIntegerValue = true;
  const isNegative =
    hasIntegerValue && (rationalValue.num < 0n || (rationalValue.num === 0n && pendingNegative));

  const slotModels = buildTotalSlotModel(toRationalCalculatorValue(rationalValue), unlockedDigits, radix);

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
  const hasCycleAmberActive = resolveCycleAmberActive(state);
  const hasImaginaryTotal =
    state.calculator.total.kind === "complex"
    && !isRealEquivalentCalculatorValue(state.calculator.total);
  const hasImaginaryHistory = hasImaginaryRollHistory(state);
  const shouldApplyCycleStyling = !hasLatestRollError && hasCycleAmberActive;
  const shouldApplyImaginaryStyling = !hasLatestRollError && !shouldApplyCycleStyling && hasImaginaryTotal;
  const hasAnyKeyPress = Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);
  const shouldRenderClearedPlaceholder =
    isClearedCalculatorState(state.calculator) && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress);
  totalEl.classList.toggle("total-display--error", hasLatestRollError);
  totalEl.classList.toggle("total-display--cycle", shouldApplyCycleStyling);
  totalEl.classList.toggle("total-display--imaginary", shouldApplyImaginaryStyling);
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
  stack.appendChild(metaRow);

  const primaryDisplay = document.createElement("div");
  primaryDisplay.className = "total-primary-display";
  const layout = document.createElement("div");
  layout.className = "total-layout";
  const leftHudTop = document.createElement("div");
  leftHudTop.className = "total-slot total-slot--left-hud-top";
  const leftHudBottom = document.createElement("div");
  leftHudBottom.className = "total-slot total-slot--left-hud-bottom";
  const centerMain = document.createElement("div");
  centerMain.className = "total-slot total-slot--center-main";
  const centerAux = document.createElement("div");
  centerAux.className = "total-slot total-slot--center-aux";
  const imaginaryDisplay = document.createElement("div");
  imaginaryDisplay.className = "total-imaginary-display";
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
  const baseIndicator = document.createElement("span");
  baseIndicator.className = "total-base-indicator";
  baseIndicator.textContent = binaryModeEnabled ? "| BIN |" : "";
  baseIndicator.setAttribute("aria-hidden", binaryModeEnabled ? "false" : "true");
  centerAux.append(hintStrip, imaginaryDisplay);
  leftHudTop.appendChild(domainIndicator);
  leftHudBottom.appendChild(baseIndicator);
  layout.append(leftHudTop, leftHudBottom, centerMain, centerAux);
  primaryDisplay.appendChild(layout);
  if (shouldRenderClearedPlaceholder) {
    const slotModels = buildClearedTotalSlotModel(state.unlocks.maxTotalDigits);
    imaginaryDisplay.setAttribute("aria-hidden", "true");
    appendSevenSegmentFrame(centerMain, slotModels);
    stack.appendChild(primaryDisplay);
    totalEl.appendChild(stack);
    totalEl.setAttribute("aria-label", "Total _");
    return;
  }
  const defaultDisplayLabel = (() => {
    const displayValue = state.calculator.total;
    if (shouldDisplayAlgLabel) {
      return "ALG";
    }
    if (isComplexCalculatorValue(displayValue) && !isRealEquivalentCalculatorValue(displayValue)) {
      return "complex";
    }
    if (binaryModeEnabled && displayValue.kind === "rational" && displayValue.value.den === 1n) {
      return displayValue.value.num.toString(2);
    }
    return calculatorValueToDisplayString(displayValue);
  })();
  totalEl.setAttribute("aria-label", `Total ${defaultDisplayLabel}`);
  const realValue = state.calculator.total.kind === "complex"
    ? scalarValueToCalculatorValue(state.calculator.total.value.re)
    : state.calculator.total;
  const imaginaryValue = state.calculator.total.kind === "complex"
    ? scalarValueToCalculatorValue(state.calculator.total.value.im)
    : state.calculator.total.kind === "nan"
      ? state.calculator.total
      : toRationalCalculatorValue({ num: 0n, den: 1n });
  imaginaryDisplay.setAttribute("aria-hidden", hasImaginaryHistory ? "false" : "true");
  if (hasImaginaryHistory) {
    renderSevenSegmentValue(
      imaginaryDisplay,
      imaginaryValue,
      state.unlocks.maxTotalDigits,
      false,
      displayRadix,
    );
  }
  renderSevenSegmentValue(
    centerMain,
    realValue,
    state.unlocks.maxTotalDigits,
    state.calculator.pendingNegativeTotal,
    displayRadix,
  );
  stack.appendChild(primaryDisplay);
  totalEl.appendChild(stack);
};
