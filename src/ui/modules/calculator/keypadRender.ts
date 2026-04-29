import { isKeyUnlocked, resolveKeyCapability } from "../../../domain/keyUnlocks.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../../../domain/keypadLayoutModel.js";
import type { Action, CalculatorId, GameState, Key, KeyCapability, KeyCell } from "../../../domain/types.js";
import { bindDraggableCell, bindDropTargetCell } from "../input/dragDrop.js";
import { bindQuickTapPressFeedback, shouldSuppressClick } from "../input/pressFeedback.js";
import { buildKeyButtonAction, formatKeyCellLabel, isToggleFlagActive } from "../calculatorStorageCore.js";
import { getKeyVisualGroup } from "./dom.js";
import { applySharedKeyButtonClasses } from "../../shared/keyButtonClasses.js";
import { setKeyButtonLabel } from "./keyLabelFit.js";
import { readToggleAnimation, queueToggleAnimation } from "./unlockTracking.js";

const appendDebugSlotLabel = (cellElement: HTMLElement, label: string): void => {
  const slotLabel = document.createElement("span");
  slotLabel.className = "slot-label";
  slotLabel.setAttribute("aria-hidden", "true");
  slotLabel.textContent = label;
  cellElement.appendChild(slotLabel);
};

const appendCapabilityBadge = (button: HTMLButtonElement, capability: KeyCapability): void => {
  if (capability === "portable") {
    return;
  }
  const badge = document.createElement("span");
  badge.className = "key__capability-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = capability === "locked" ? "\u{1F512}" : "\u{1F513}";
  button.appendChild(badge);
};

const buildKeypadSlotLabels = (
  layout: GameState["ui"]["keyLayout"],
  columns: number,
  rows: number,
): string[] =>
  layout.map((_cell, index) => {
    const coord = toCoordFromIndex(index, columns, rows);
    return `R${coord.row}C${coord.col} #${index}`;
  });

export const renderKeypadCells = (
  root: Element,
  keysEl: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    calculatorId?: CalculatorId;
    calculatorKeysLocked: boolean;
    newlyUnlockedKeys: Set<Key>;
    bindUnlockAnimationLock: (element: HTMLElement) => void;
  },
): void => {
  const keypadSurface = options.calculatorId === "g"
    ? "keypad_g"
    : options.calculatorId === "menu"
      ? "keypad_menu"
    : options.calculatorId === "f_prime"
      ? "keypad_f_prime"
    : options.calculatorId === "g_prime"
      ? "keypad_g_prime"
    : options.calculatorId === "h_prime"
      ? "keypad_h_prime"
    : options.calculatorId === "i_prime"
      ? "keypad_i_prime"
    : options.calculatorId === "f"
      ? "keypad_f"
      : "keypad";
  const slotLabels = buildKeypadSlotLabels(state.ui.keyLayout, state.ui.keypadColumns, state.ui.keypadRows);
  for (let index = 0; index < state.ui.keyLayout.length; index += 1) {
    const cell = state.ui.keyLayout[index];
    const slotLabel = slotLabels[index] ?? `#${index}`;
    const slotId = getSlotIdAtIndex(index, state.ui.keypadColumns, state.ui.keypadRows);

    if (cell.kind === "placeholder") {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder placeholder--drop-slot";
      placeholder.setAttribute("aria-hidden", "true");
      bindDropTargetCell(placeholder, keypadSurface, index);
      placeholder.dataset.layoutOccupied = "empty";
      placeholder.dataset.keypadCellId = slotId;
      appendDebugSlotLabel(placeholder, slotLabel);
      keysEl.appendChild(placeholder);
      continue;
    }

    const capability = resolveKeyCapability(state, cell.key);
    const unlocked = isKeyUnlocked(state, cell.key);
    const isPortable = capability === "portable";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    if (isPortable) {
      button.classList.add("key--draggable");
    } else if (capability === "locked") {
      button.classList.add("key--locked-capability");
    }
    applySharedKeyButtonClasses(button, {
      key: cell.key,
      visualGroup: getKeyVisualGroup(cell.key),
      isUnlocked: unlocked,
      newlyUnlockedKeys: options.newlyUnlockedKeys,
    });
    if (unlocked && options.newlyUnlockedKeys.has(cell.key)) {
      options.bindUnlockAnimationLock(button);
    }

    setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
    appendCapabilityBadge(button, capability);
    const keypadToggleActive = isToggleFlagActive(state, cell);
    button.classList.toggle("key--toggle-active", keypadToggleActive);
    const keypadToggleAnim = readToggleAnimation(root, cell);
    if (keypadToggleAnim === "on") {
      button.classList.add("key--toggle-animate-on");
    } else if (keypadToggleAnim === "off") {
      button.classList.add("key--toggle-animate-off");
    }

    button.setAttribute("aria-pressed", keypadToggleActive ? "true" : "false");
    button.disabled = options.calculatorKeysLocked;
    button.dataset.keypadCellId = slotId;
    button.dataset.key = cell.key;
    bindQuickTapPressFeedback(root, button);
    if (isPortable) {
      bindDraggableCell(root, button, state, dispatch, { surface: keypadSurface, index }, cell.key);
    }
    appendDebugSlotLabel(button, slotLabel);

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      if (shouldSuppressClick(root)) {
        return;
      }
      queueToggleAnimation(root, state, cell as KeyCell);
      const action = buildKeyButtonAction(cell as KeyCell);
      if (options.calculatorId && (action.type === "PRESS_KEY" || action.type === "TOGGLE_FLAG" || action.type === "TOGGLE_VISUALIZER")) {
        dispatch({ ...action, calculatorId: options.calculatorId });
      } else {
        dispatch(action);
      }
    });
    keysEl.appendChild(button);
  }
};



