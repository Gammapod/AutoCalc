import { calculatorValueToDisplayString, isRationalCalculatorValue, toRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import { getRollYDomain } from "../../../domain/rollDerived.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../../../domain/keypadLayoutModel.js";
import { getLambdaDerivedValues, getLambdaUnusedPoints } from "../../../domain/lambdaControl.js";
import type { Action, CalculatorValue, GameState, Key, KeyCell } from "../../../domain/types.js";
import type { InteractionMode } from "../../../app/interactionRuntime.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import { buildStepBodyHighlightRegions, resolveStepBodyHighlightRects } from "../../stepHighlight.js";
import { resolveLayoutMotionIntent } from "../../layout/motionCoordinator.js";
import { beginMotionCycle, completeMotionCycle } from "../../layout/motionLifecycleBridge.js";
import {
  applyDesktopLayoutSnapshot,
  clearDesktopSizingVars,
  isDesktopShellContext,
  resolveSingleInstanceSnapshot,
} from "../../layout/layoutAdapter.js";
import { beginInputAnimationLock, bindQuickTapPressFeedback, shouldSuppressClick } from "../input/pressFeedback.js";
import { bindDraggableCell, bindDropTargetCell } from "../input/dragDrop.js";
import {
  buildKeyButtonAction,
  formatKeyCellLabel,
  getToggleAnimationIdForCell,
  isToggleFlagActive,
} from "../calculatorStorageCore.js";
import { getKeyVisualGroup, resolveCalculatorKeysLocked } from "./dom.js";
import {
  buildClearedTotalSlotModel,
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildTotalSlotModel,
  getRollLineClassName,
  isClearedCalculatorState,
  type SegmentName,
} from "./viewModel.js";
import {
  clearToggleAnimations,
  getCalculatorLayoutRuntimeState,
  getCalculatorModuleState,
  queueToggleAnimation as queueToggleAnimationById,
  readToggleAnimation as readToggleAnimationById,
} from "./runtime.js";

const SEGMENT_NAMES: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];
const INPUT_LOCK_FALLBACK_BUFFER_MS = 80;
const UNLOCK_ANIMATION_DURATION_MS = 1200;
const KEYPAD_SLOT_ENTER_DURATION_MS = 760;
const KEYPAD_GROW_MAX_DURATION_MS = 880;
const CALC_GROW_MAX_DURATION_MS = 980;
const UNLOCK_ANIMATION_NAME = "key-unlock-pulse";
const KEYPAD_SLOT_ENTER_ANIMATION_NAME = "keypad-slot-enter";
const STEP_BODY_HIGHLIGHT_CLASS = "keypad-step-body-highlight";
const KEY_LABEL_INLINE_GUTTER_PX = 6;
const KEY_LABEL_SQUISH_THRESHOLD_PX = 2;

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

const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
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

const isFeedRollVisible = (state: GameState): boolean => state.ui.activeVisualizer === "feed";

const buildKeypadSlotLabels = (
  layout: GameState["ui"]["keyLayout"],
  columns: number,
  rows: number,
): string[] =>
  layout.map((_cell, index) => {
    const coord = toCoordFromIndex(index, columns, rows);
    return `R${coord.row}C${coord.col} #${index}`;
  });

const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const bindAnimationLock = (
  element: HTMLElement,
  matchesAnimationName: (animationName: string) => boolean,
  fallbackMs: number,
): void => {
  let releaseLock: (() => void) | null = null;
  const controller = new AbortController();
  const releaseAndCleanup = (): void => {
    if (!releaseLock) {
      return;
    }
    const release = releaseLock;
    releaseLock = null;
    release();
    controller.abort();
  };

  element.addEventListener(
    "animationstart",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName) || releaseLock) {
        return;
      }
      const runtimeRoot = element.closest("#app") ?? undefined;
      releaseLock = beginInputAnimationLock(fallbackMs + INPUT_LOCK_FALLBACK_BUFFER_MS, runtimeRoot ?? undefined);
    },
    { signal: controller.signal },
  );
  element.addEventListener(
    "animationend",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName)) {
        return;
      }
      releaseAndCleanup();
    },
    { signal: controller.signal },
  );
  element.addEventListener(
    "animationcancel",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName)) {
        return;
      }
      releaseAndCleanup();
    },
    { signal: controller.signal },
  );
};

const bindExactAnimationLock = (element: HTMLElement, animationName: string, fallbackMs: number): void => {
  bindAnimationLock(element, (activeAnimationName) => activeAnimationName === animationName, fallbackMs);
};

const bindPrefixedAnimationLock = (element: HTMLElement, animationPrefix: string, fallbackMs: number): void => {
  bindAnimationLock(
    element,
    (activeAnimationName) => activeAnimationName.startsWith(animationPrefix),
    fallbackMs,
  );
};

const bindPrefixedAnimationCompletion = (
  element: HTMLElement,
  animationPrefix: string,
  onComplete: () => void,
): void => {
  let completed = false;
  const finish = (): void => {
    if (completed) {
      return;
    }
    completed = true;
    onComplete();
  };

  element.addEventListener("animationend", (event: Event) => {
    const animationEvent = event as AnimationEvent;
    if (!animationEvent.animationName.startsWith(animationPrefix)) {
      return;
    }
    finish();
  });
  element.addEventListener("animationcancel", (event: Event) => {
    const animationEvent = event as AnimationEvent;
    if (!animationEvent.animationName.startsWith(animationPrefix)) {
      return;
    }
    finish();
  });
};

const collectKeypadCellRects = (container: Element): Map<string, DOMRect> => {
  const rects = new Map<string, DOMRect>();
  for (const element of Array.from(container.children)) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    const cellId = element.dataset.keypadCellId;
    if (!cellId) {
      continue;
    }
    rects.set(cellId, element.getBoundingClientRect());
  }
  return rects;
};

const playKeypadFlip = (container: Element, beforeRects: Map<string, DOMRect>): void => {
  if (shouldReduceMotion() || beforeRects.size === 0) {
    return;
  }

  const animatedElements: HTMLElement[] = [];
  for (const element of Array.from(container.children)) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    const cellId = element.dataset.keypadCellId;
    if (!cellId) {
      continue;
    }
    if (!beforeRects.has(cellId)) {
      bindExactAnimationLock(element, KEYPAD_SLOT_ENTER_ANIMATION_NAME, KEYPAD_SLOT_ENTER_DURATION_MS);
      element.classList.add("keypad-slot-enter");
      animatedElements.push(element);
    }
  }

  if (animatedElements.length === 0) {
    return;
  }

  for (const element of animatedElements) {
    window.setTimeout(() => {
      element.classList.remove("keypad-slot-enter");
    }, KEYPAD_SLOT_ENTER_DURATION_MS + 20);
  }
};

const setKeyButtonLabel = (button: HTMLButtonElement, label: string): void => {
  button.textContent = "";
  const labelEl = document.createElement("span");
  labelEl.className = "key__label";
  labelEl.textContent = label;
  button.appendChild(labelEl);
};

const fitKeyButtonLabel = (button: HTMLButtonElement): void => {
  const labelEl = button.querySelector<HTMLElement>(".key__label");
  if (!labelEl) {
    return;
  }
  labelEl.style.transform = "scaleX(1)";
  const computed = window.getComputedStyle(button);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const contentWidth = button.clientWidth - paddingLeft - paddingRight;
  const availableWidth = Math.max(1, contentWidth - KEY_LABEL_INLINE_GUTTER_PX * 2);
  const measuredWidth = labelEl.getBoundingClientRect().width;
  const naturalWidth = Math.max(1, Math.ceil(measuredWidth || labelEl.scrollWidth));
  if (naturalWidth <= availableWidth + KEY_LABEL_SQUISH_THRESHOLD_PX) {
    return;
  }
  const scale = Math.max(0.01, availableWidth / naturalWidth);
  labelEl.style.transform = `scaleX(${scale.toFixed(4)})`;
};

const fitKeyLabelsInContainer = (container: ParentNode): void => {
  const buttons = container.querySelectorAll<HTMLButtonElement>(".key");
  buttons.forEach((button) => fitKeyButtonLabel(button));
};

const refitAllVisibleKeyLabels = (root: Element): void => {
  const keypad = root.querySelector<HTMLElement>("[data-keys]");
  if (keypad) {
    fitKeyLabelsInContainer(keypad);
  }
  const storage = root.querySelector<HTMLElement>("[data-storage-keys]");
  if (storage) {
    fitKeyLabelsInContainer(storage);
  }
};

const ensureKeyLabelResizeListener = (root: Element): void => {
  const calculatorState = getCalculatorModuleState(root);
  if (calculatorState.keyLabelResizeBound) {
    return;
  }
  calculatorState.keyLabelResizeBound = true;
  window.addEventListener("resize", () => {
    refitAllVisibleKeyLabels(root);
  });
};

const appendDebugSlotLabel = (cellElement: HTMLElement, label: string): void => {
  const slotLabel = document.createElement("span");
  slotLabel.className = "slot-label";
  slotLabel.setAttribute("aria-hidden", "true");
  slotLabel.textContent = label;
  cellElement.appendChild(slotLabel);
};

const buildUnlockSnapshot = (state: GameState): Record<Key, boolean> => {
  const snapshot: Partial<Record<Key, boolean>> = {};

  for (const [key, unlocked] of Object.entries(state.unlocks.valueAtoms)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueCompose)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueExpression)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.slotOperators)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.utilities)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.memory)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.steps)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.visualizers)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.execution)) {
    snapshot[key as Key] = unlocked;
  }

  return snapshot as Record<Key, boolean>;
};

const getNewlyUnlockedKeys = (root: Element, state: GameState): Set<Key> => {
  const calculatorState = getCalculatorModuleState(root);
  const currentSnapshot = buildUnlockSnapshot(state);
  if (!calculatorState.previousUnlockSnapshot) {
    calculatorState.previousUnlockSnapshot = currentSnapshot;
    return new Set<Key>();
  }

  const newlyUnlocked = new Set<Key>();
  for (const key of Object.keys(currentSnapshot) as Key[]) {
    if (!calculatorState.previousUnlockSnapshot[key] && currentSnapshot[key]) {
      newlyUnlocked.add(key);
    }
  }
  calculatorState.previousUnlockSnapshot = currentSnapshot;
  return newlyUnlocked;
};

const queueToggleAnimation = (root: Element, state: GameState, cell: KeyCell): void => {
  const toggleAnimationId = getToggleAnimationIdForCell(cell);
  if (!toggleAnimationId) {
    return;
  }
  queueToggleAnimationById(
    root,
    toggleAnimationId,
    isToggleFlagActive(state, cell) ? "off" : "on",
  );
};

const readToggleAnimation = (root: Element, cell: KeyCell): "on" | "off" | null => {
  const toggleAnimationId = getToggleAnimationIdForCell(cell);
  if (!toggleAnimationId) {
    return null;
  }
  return readToggleAnimationById(root, toggleAnimationId);
};

export const renderCalculatorV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    interactionMode: InteractionMode;
    inputBlocked: boolean;
  },
): void => {
  ensureKeyLabelResizeListener(root);
  const totalEl = root.querySelector("[data-v2-total-panel]") ?? root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const keysEl = root.querySelector("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !keysEl) {
    throw new Error("Calculator UI mount points are missing.");
  }

  const interactionMode = options.interactionMode;
  const inputBlocked = options.inputBlocked;
  const calculatorKeysLocked = resolveCalculatorKeysLocked(
    interactionMode,
    inputBlocked,
    document.body.getAttribute("data-ui-shell"),
  );
  if (root instanceof HTMLElement) {
    root.dataset.interactionMode = interactionMode;
    root.dataset.inputBlocked = inputBlocked ? "true" : "false";
  }

  const newlyUnlockedKeys = getNewlyUnlockedKeys(root, state);

  renderTotalDisplay(totalEl, state);
  slotEl.textContent = buildOperationSlotDisplay(state);

  const rollView = buildRollViewModel(state.calculator.rollEntries);
  const rollVisible = isFeedRollVisible(state);
  rollEl.innerHTML = "";
  rollEl.setAttribute("data-roll-visible", rollVisible ? "true" : "false");
  rollEl.setAttribute("aria-hidden", rollVisible ? "false" : "true");
  rollEl.setAttribute("aria-label", rollVisible ? "Calculator roll" : "Calculator roll hidden");
  if (rollEl instanceof HTMLElement) {
    rollEl.style.setProperty("--roll-line-count", rollView.lineCount.toString());
  }
  for (const row of rollView.rows) {
    const line = document.createElement("div");
    line.className = getRollLineClassName(row);

    const prefix = document.createElement("span");
    prefix.className = "roll-prefix";
    prefix.textContent = row.prefix;
    line.appendChild(prefix);

    const value = document.createElement("span");
    value.className = "roll-value";
    value.textContent = row.value;
    line.appendChild(value);

    if (row.errorCode) {
      const remainder = document.createElement("span");
      remainder.className = "roll-remainder";
      remainder.textContent = `Err: ${row.errorCode}`;
      line.appendChild(remainder);
    } else if (row.remainder) {
      const remainder = document.createElement("span");
      remainder.className = "roll-remainder";
      remainder.textContent = `\u27E1= ${row.remainder}`;
      line.appendChild(remainder);
    }

    rollEl.appendChild(line);
  }

  const desktopShell = isDesktopShellContext(root);
  const runtime = getCalculatorLayoutRuntimeState(root);
  const calcBodyEl = keysEl.closest<HTMLElement>(".calc");
  const currentSnapshot =
    keysEl instanceof HTMLElement
      ? resolveSingleInstanceSnapshot({
          root,
          keysEl,
          calcBodyEl,
          columns: state.ui.keypadColumns,
          rows: state.ui.keypadRows,
          interactionMode,
          inputBlocked,
        })
      : null;

  const modeChanged = runtime.previousInteractionMode !== null && runtime.previousInteractionMode !== interactionMode;
  const layoutMotionToken = beginMotionCycle("layout", CALC_GROW_MAX_DURATION_MS + INPUT_LOCK_FALLBACK_BUFFER_MS);
  let layoutMotionCompleted = false;
  const completeLayoutMotion = (): void => {
    if (layoutMotionCompleted) {
      return;
    }
    layoutMotionCompleted = true;
    completeMotionCycle(layoutMotionToken);
  };

  const motionIntent =
    currentSnapshot
      ? resolveLayoutMotionIntent(runtime.previousSnapshot, currentSnapshot, {
          reduceMotion: shouldReduceMotion(),
          modeChanged,
        })
      : {
          kind: "none" as const,
          forCalculatorId: "primary",
          keypadGrowDirection: "",
        };

  const keypadDimensionsChanged = motionIntent.keypadGrowDirection !== "";
  const keypadBeforeRects = keypadDimensionsChanged ? collectKeypadCellRects(keysEl) : new Map<string, DOMRect>();

  keysEl.innerHTML = "";
  if (keysEl instanceof HTMLElement) {
    if (desktopShell && currentSnapshot) {
      applyDesktopLayoutSnapshot(keysEl, calcBodyEl, currentSnapshot);
    } else {
      keysEl.style.gridTemplateColumns = `repeat(${state.ui.keypadColumns}, minmax(0, 1fr))`;
      keysEl.style.gridTemplateRows = `repeat(${state.ui.keypadRows}, minmax(48px, 1fr))`;
      keysEl.style.removeProperty("height");
      clearDesktopSizingVars(keysEl, calcBodyEl);
    }

    if (!keypadDimensionsChanged) {
      delete keysEl.dataset.keypadGrow;
      if (calcBodyEl) {
        delete calcBodyEl.dataset.keypadGrow;
      }
      completeLayoutMotion();
    } else {
      const growDirection = motionIntent.keypadGrowDirection;
      if (growDirection) {
        if (!desktopShell) {
          keysEl.dataset.keypadGrow = growDirection;
          bindPrefixedAnimationLock(keysEl, "keypad-grow-", KEYPAD_GROW_MAX_DURATION_MS);
        } else {
          delete keysEl.dataset.keypadGrow;
        }
        if (calcBodyEl) {
          calcBodyEl.dataset.keypadGrow = growDirection;
          bindPrefixedAnimationLock(calcBodyEl, "calc-grow-", CALC_GROW_MAX_DURATION_MS);
          bindPrefixedAnimationCompletion(calcBodyEl, "calc-grow-", completeLayoutMotion);
        } else if (!desktopShell) {
          bindPrefixedAnimationCompletion(keysEl, "keypad-grow-", completeLayoutMotion);
        }
      } else {
        delete keysEl.dataset.keypadGrow;
        if (calcBodyEl) {
          delete calcBodyEl.dataset.keypadGrow;
        }
        completeLayoutMotion();
      }
    }
  }

  const slotLabels = buildKeypadSlotLabels(state.ui.keyLayout, state.ui.keypadColumns, state.ui.keypadRows);
  const stepBodyHighlights = buildStepBodyHighlightRegions(state);
  for (let index = 0; index < state.ui.keyLayout.length; index += 1) {
    const cell = state.ui.keyLayout[index];
    const slotLabel = slotLabels[index] ?? `#${index}`;
    const slotId = getSlotIdAtIndex(index, state.ui.keypadColumns, state.ui.keypadRows);

    if (cell.kind === "placeholder") {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder placeholder--drop-slot";
      placeholder.setAttribute("aria-hidden", "true");
      bindDropTargetCell(placeholder, "keypad", index);
      placeholder.dataset.layoutOccupied = "empty";
      placeholder.dataset.keypadCellId = slotId;
      appendDebugSlotLabel(placeholder, slotLabel);
      keysEl.appendChild(placeholder);
      continue;
    }

    if (!isKeyUnlocked(state, cell.key)) {
      const hidden = document.createElement("div");
      hidden.className = "placeholder placeholder--drop-slot placeholder--locked-hidden";
      hidden.setAttribute("aria-hidden", "true");
      hidden.dataset.keypadCellId = slotId;
      appendDebugSlotLabel(hidden, slotLabel);
      keysEl.appendChild(hidden);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "key key--draggable";
    button.classList.add(`key--group-${getKeyVisualGroup(cell.key)}`);
    if (cell.key === "NEG") {
      button.classList.add("key--value-modifier");
    }
    if (newlyUnlockedKeys.has(cell.key)) {
      button.classList.add("key--unlock-animate");
      bindExactAnimationLock(button, UNLOCK_ANIMATION_NAME, UNLOCK_ANIMATION_DURATION_MS);
    }

    setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
    const keypadToggleActive = isToggleFlagActive(state, cell);
    button.classList.toggle("key--toggle-active", keypadToggleActive);
    const keypadToggleAnimation = readToggleAnimation(root, cell);
    if (keypadToggleAnimation === "on") {
      button.classList.add("key--toggle-animate-on");
    } else if (keypadToggleAnimation === "off") {
      button.classList.add("key--toggle-animate-off");
    }

    button.setAttribute("aria-pressed", keypadToggleActive ? "true" : "false");
    button.disabled = calculatorKeysLocked;
    button.dataset.keypadCellId = slotId;
    button.dataset.key = cell.key;
    bindQuickTapPressFeedback(root, button);
    bindDraggableCell(root, button, state, dispatch, { surface: "keypad", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      if (interactionMode !== "calculator") {
        return;
      }
      if (shouldSuppressClick(root)) {
        return;
      }
      queueToggleAnimation(root, state, cell);
      dispatch(buildKeyButtonAction(state, cell));
    });
    keysEl.appendChild(button);
  }

  const stepHighlightRects = resolveStepBodyHighlightRects(keysEl, stepBodyHighlights);
  for (const rect of stepHighlightRects) {
    const highlight = document.createElement("div");
    highlight.className = STEP_BODY_HIGHLIGHT_CLASS;
    highlight.setAttribute("aria-hidden", "true");
    highlight.style.left = `${rect.left.toFixed(2)}px`;
    highlight.style.top = `${rect.top.toFixed(2)}px`;
    highlight.style.width = `${rect.width.toFixed(2)}px`;
    highlight.style.height = `${rect.height.toFixed(2)}px`;
    keysEl.appendChild(highlight);
  }
  fitKeyLabelsInContainer(keysEl);

  if (keypadDimensionsChanged && !desktopShell) {
    playKeypadFlip(keysEl, keypadBeforeRects);
  }
  runtime.previousSnapshot = currentSnapshot;
  runtime.previousInteractionMode = interactionMode;

  clearToggleAnimations(root);
};
