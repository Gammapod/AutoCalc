import {
  calculatorValueToDisplayString,
  isComplexCalculatorValue,
  isRationalCalculatorValue,
  isRealEquivalentCalculatorValue,
  scalarValueToCalculatorValue,
} from "../../../domain/calculatorValue.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import { projectControlFromState } from "../../../domain/controlProjection.js";
import { projectEligibleUnlockHintProgressRows, type UnlockHintProgressRow } from "../../../domain/unlockHintProgress.js";
import type { CalculatorValue, GameState, UnlockEffect } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import { getAppServices } from "../../../contracts/appServices.js";
import { buildSelectionRenderModel } from "../../shared/readModel.selection.js";
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

type ClosestHintCategory = "operator" | "non_operator" | "lambda_point" | "calculator";

const isOperatorUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_slot_operator";

const isNonOperatorKeyUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_digit"
  || effect.type === "unlock_execution"
  || effect.type === "unlock_visualizer"
  || effect.type === "unlock_utility"
  || effect.type === "unlock_memory";

const isLambdaPointUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "increase_allocator_max_points"
  || effect.type === "increase_allocator_max_points_for_calculator";

const isCalculatorUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_calculator";

const getRowScore = (row: UnlockHintProgressRow): number =>
  row.progress.mode === "partial"
    ? row.progress.progress01
    : row.progress.state === "observed"
      ? 1
      : 0;

const toProgressFraction = (row: UnlockHintProgressRow): string => {
  if (row.progress.mode === "partial") {
    const current = Math.max(0, Math.floor(row.progress.current));
    const target = Math.max(1, Math.floor(row.progress.target));
    return `${current.toString()}/${target.toString()}`;
  }
  return row.progress.state === "observed" ? "1/1" : "0/1";
};

const buildClosestHintRows = (state: GameState): Array<{ label: string; value: string }> => {
  const eligibleRows = projectEligibleUnlockHintProgressRows(state);
  const catalog = getAppServices().contentProvider.unlockCatalog;
  const unlockById = new Map(catalog.map((unlock) => [unlock.id, unlock]));

  const chooseForCategory = (category: ClosestHintCategory): UnlockHintProgressRow | null => {
    const filtered = eligibleRows.filter((row) => {
      const unlock = unlockById.get(row.unlockId);
      if (!unlock) {
        return false;
      }
      if (category === "operator") {
        return isOperatorUnlockEffect(unlock.effect);
      }
      if (category === "non_operator") {
        return isNonOperatorKeyUnlockEffect(unlock.effect);
      }
      if (category === "calculator") {
        return isCalculatorUnlockEffect(unlock.effect);
      }
      return isLambdaPointUnlockEffect(unlock.effect);
    });
    if (filtered.length === 0) {
      return null;
    }
    filtered.sort((left, right) => {
      const delta = getRowScore(right) - getRowScore(left);
      if (Math.abs(delta) > Number.EPSILON) {
        return delta > 0 ? 1 : -1;
      }
      const leftType = left.predicateType;
      const rightType = right.predicateType;
      if (leftType < rightType) {
        return -1;
      }
      if (leftType > rightType) {
        return 1;
      }
      return left.unlockId.localeCompare(right.unlockId);
    });
    return filtered[0] ?? null;
  };

  const categories: Array<{ key: ClosestHintCategory; label: string }> = [
    { key: "operator", label: "OP" },
    { key: "non_operator", label: "KEY" },
    { key: "calculator", label: "CALC" },
    { key: "lambda_point", label: "LAMBDA" },
  ];

  return categories.map((category) => {
    const match = chooseForCategory(category.key);
    if (!match) {
      return { label: category.label, value: "n/a" };
    }
    return {
      label: category.label,
      value: `${toProgressFraction(match)} ${match.predicateType}`,
    };
  });
};

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
  const projection = projectControlFromState(state);
  const selectionVm = buildSelectionRenderModel(state);
  const buildMemoryStatusRow = (): HTMLElement => {
    const row = document.createElement("div");
    row.className = "total-memory-row";

    const lambda = document.createElement("span");
    lambda.className = "total-memory-lambda";
    lambda.textContent = `\u03BB = ${projection.budget.unused.toString()}`;
    row.appendChild(lambda);

    const variables = document.createElement("div");
    variables.className = "total-memory-variables";
    const variableValues: Array<{ symbol: "\u03B1" | "\u03B2" | "\u03B3" | "\u03B4" | "\u03F5"; value: string }> = [
      { symbol: "\u03B1", value: projection.fields.alpha.toString() },
      { symbol: "\u03B2", value: projection.fields.beta.toString() },
      { symbol: "\u03B3", value: projection.fields.gamma.toString() },
      { symbol: "\u03B4", value: projection.deltaEffective.toString() },
      { symbol: "\u03F5", value: toDisplayString(projection.epsilonEffective) },
    ];
    for (const entry of variableValues) {
      const token = document.createElement("span");
      token.className = "total-memory-var";
      const isSelected = (
        (entry.symbol === "\u03B1" && selectionVm.highlightByField.alpha)
        || (entry.symbol === "\u03B2" && selectionVm.highlightByField.beta)
        || (entry.symbol === "\u03B3" && selectionVm.highlightByField.gamma)
        || (entry.symbol === "\u03B4" && selectionVm.highlightByField.delta)
        || (entry.symbol === "\u03F5" && selectionVm.highlightByField.epsilon)
      );
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
  const renderSharedMemoryFooter = (): void => {
    const displayWindow = totalEl.closest("[data-display-window]");
    const footer = displayWindow?.querySelector<HTMLElement>("[data-v2-total-footer]");
    if (!footer) {
      return;
    }
    footer.innerHTML = "";
    footer.appendChild(buildMemoryStatusRow());
  };

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
  renderSharedMemoryFooter();
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
  const hintRows = buildClosestHintRows(state);
  const hintStrip = document.createElement("div");
  hintStrip.className = "total-hint-strip";
  for (const hintRow of hintRows) {
    const row = document.createElement("div");
    row.className = "total-hint-row";
    const label = document.createElement("span");
    label.className = "total-hint-label";
    label.textContent = hintRow.label;
    const value = document.createElement("span");
    value.className = "total-hint-value";
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
