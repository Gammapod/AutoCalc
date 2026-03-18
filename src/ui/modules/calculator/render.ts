import type { Action, GameState } from "../../../domain/types.js";
import { buildStepBodyHighlightRegions, resolveStepBodyHighlightRects } from "../../stepHighlight.js";
import { resolveLayoutMotionIntent } from "../../layout/motionCoordinator.js";
import { beginMotionCycle, completeMotionCycle } from "../../layout/motionLifecycleBridge.js";
import {
  applyDesktopLayoutSnapshot,
  clearDesktopSizingVars,
  isDesktopShellContext,
  resolveSingleInstanceSnapshot,
} from "../../layout/layoutAdapter.js";
import { resolveCalculatorKeysLocked } from "./dom.js";
import {
  buildOperationSlotDisplayModel,
  buildRollViewModel,
  getRollLineClassName,
} from "./viewModel.js";
import {
  bindOrUpdateSlotMarquee,
  clearToggleAnimations,
  getCalculatorLayoutRuntimeState,
} from "./runtime.js";
import { ensureKeyLabelResizeListener, fitKeyLabelsInContainer } from "./keyLabelFit.js";
import { renderTotalDisplay } from "./totalDisplay.js";
import {
  bindExactAnimationLock,
  bindPrefixedAnimationCompletion,
  bindPrefixedAnimationLock,
  collectKeypadCellRects,
  playKeypadFlip,
  shouldReduceMotion,
} from "./motion.js";
import { getNewlyUnlockedKeys } from "./unlockTracking.js";
import { renderKeypadCells } from "./keypadRender.js";

const INPUT_LOCK_FALLBACK_BUFFER_MS = 80;
const UNLOCK_ANIMATION_DURATION_MS = 1200;
const KEYPAD_SLOT_ENTER_DURATION_MS = 760;
const KEYPAD_GROW_MAX_DURATION_MS = 880;
const CALC_GROW_MAX_DURATION_MS = 980;
const UNLOCK_ANIMATION_NAME = "key-unlock-pulse";
const KEYPAD_SLOT_ENTER_ANIMATION_NAME = "keypad-slot-enter";
const STEP_BODY_HIGHLIGHT_CLASS = "keypad-step-body-highlight";

const isFeedRollVisible = (state: GameState): boolean => state.ui.activeVisualizer === "feed";

const appendSlotTrackBase = (
  parent: HTMLElement,
  base: string,
  stepTargetTokenIndex: number | null,
): void => {
  if (stepTargetTokenIndex === null) {
    const textNode = document.createElement("span");
    textNode.textContent = base;
    parent.appendChild(textNode);
    return;
  }

  const tokenRegex = /\[[^\]]*\]/g;
  let tokenIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null = tokenRegex.exec(base);
  while (match) {
    const start = match.index;
    const end = tokenRegex.lastIndex;
    if (start > cursor) {
      const textPrefix = document.createElement("span");
      textPrefix.textContent = base.slice(cursor, start);
      parent.appendChild(textPrefix);
    }

    const token = document.createElement("span");
    token.className = "slot-display__token";
    if (tokenIndex === stepTargetTokenIndex) {
      token.classList.add("slot-display__token--step-target");
    }
    token.textContent = base.slice(start, end);
    parent.appendChild(token);

    tokenIndex += 1;
    cursor = end;
    match = tokenRegex.exec(base);
  }

  if (cursor < base.length) {
    const textSuffix = document.createElement("span");
    textSuffix.textContent = base.slice(cursor);
    parent.appendChild(textSuffix);
  }
};


export const renderCalculatorV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    inputBlocked: boolean;
  },
): void => {
  const calculatorId: "g" | "f" =
    root instanceof HTMLElement && root.dataset.calcInstanceId === "g"
      ? "g"
      : "f";
  ensureKeyLabelResizeListener(root);
  const totalEl = root.querySelector("[data-v2-total-panel]") ?? root.querySelector("[data-total]");
  const slotEl = root.querySelector<HTMLElement>("[data-slot]");
  const rollEl = root.querySelector<HTMLElement>("[data-roll]");
  const keysEl = root.querySelector<HTMLElement>("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !keysEl) {
    throw new Error("Calculator UI mount points are missing.");
  }

  const inputBlocked = options.inputBlocked;
  const calculatorKeysLocked = resolveCalculatorKeysLocked(inputBlocked);
  if (root instanceof HTMLElement) {
    root.dataset.inputBlocked = inputBlocked ? "true" : "false";
  }

  const newlyUnlockedKeys = getNewlyUnlockedKeys(root, state);

  renderTotalDisplay(totalEl, state);
  const slotDisplay = buildOperationSlotDisplayModel(state);
  slotEl.textContent = "";
  const viewport = document.createElement("span");
  viewport.className = "slot-display__viewport";
  const track = document.createElement("span");
  track.className = "slot-display__track";
  const slotBase = document.createElement("span");
  appendSlotTrackBase(slotBase, slotDisplay.displayFunctionBase, slotDisplay.stepTargetTokenIndex);
  track.appendChild(slotBase);
  if (slotDisplay.deltaWrapSuffix) {
    const deltaWrap = document.createElement("span");
    deltaWrap.className = "slot-display__delta-wrap";
    deltaWrap.textContent = slotDisplay.deltaWrapSuffix;
    track.appendChild(deltaWrap);
  }
  const ellipsis = document.createElement("span");
  ellipsis.className = "slot-display__ellipsis";
  ellipsis.textContent = "\u2026";
  const fixedSeed = document.createElement("span");
  fixedSeed.className = "slot-display__seed";
  fixedSeed.textContent = slotDisplay.fixedSeedLabel;
  viewport.appendChild(track);
  slotEl.appendChild(viewport);
  slotEl.appendChild(ellipsis);
  slotEl.appendChild(fixedSeed);
  bindOrUpdateSlotMarquee(root, { slotEl, viewportEl: viewport, trackEl: track });

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
      remainder.textContent = `r= ${row.remainder}`;
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
          inputBlocked,
        })
      : null;

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

  const stepBodyHighlights = buildStepBodyHighlightRegions(state);
  renderKeypadCells(root, keysEl, state, dispatch, {
    calculatorId,
    calculatorKeysLocked,
    newlyUnlockedKeys,
    bindUnlockAnimationLock: (element) => {
      bindExactAnimationLock(element, UNLOCK_ANIMATION_NAME, UNLOCK_ANIMATION_DURATION_MS);
    },
  });

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
    playKeypadFlip(keysEl, keypadBeforeRects, {
      keypadSlotEnterAnimationName: KEYPAD_SLOT_ENTER_ANIMATION_NAME,
      keypadSlotEnterDurationMs: KEYPAD_SLOT_ENTER_DURATION_MS,
    });
  }
  runtime.previousSnapshot = currentSnapshot;

  clearToggleAnimations(root);
};

