import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../../../domain/keypadLayoutModel.js";
import { getButtonDefinition } from "../../../domain/buttonRegistry.js";
import type { Action, GameState, Key, KeyCell } from "../../../domain/types.js";
import { bindDraggableCell, bindDropTargetCell } from "../input/dragDrop.js";
import { bindQuickTapPressFeedback, shouldSuppressClick } from "../input/pressFeedback.js";
import { buildKeyButtonAction, formatKeyCellLabel, isAutoEqualsToggleCell, isToggleFlagActive } from "../calculatorStorageCore.js";
import { getKeyVisualGroup } from "./dom.js";
import { setKeyButtonLabel } from "./keyLabelFit.js";
import { readToggleAnimation, queueToggleAnimation } from "./unlockTracking.js";
import { AUTO_EQUALS_FLAG } from "../../../domain/state.js";

const appendDebugSlotLabel = (cellElement: HTMLElement, label: string): void => {
  const slotLabel = document.createElement("span");
  slotLabel.className = "slot-label";
  slotLabel.setAttribute("aria-hidden", "true");
  slotLabel.textContent = label;
  cellElement.appendChild(slotLabel);
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
    calculatorKeysLocked: boolean;
    newlyUnlockedKeys: Set<Key>;
    bindUnlockAnimationLock: (element: HTMLElement) => void;
  },
): void => {
  const slotLabels = buildKeypadSlotLabels(state.ui.keyLayout, state.ui.keypadColumns, state.ui.keypadRows);
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
    if (getButtonDefinition(cell.key)?.unlockGroup === "unaryOperators") {
      button.classList.add("key--unary-operator");
    }
    if (options.newlyUnlockedKeys.has(cell.key)) {
      button.classList.add("key--unlock-animate");
      options.bindUnlockAnimationLock(button);
    }

    setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
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
    bindDraggableCell(root, button, state, dispatch, { surface: "keypad", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      if (shouldSuppressClick(root)) {
        return;
      }
      if (state.ui.buttonFlags[AUTO_EQUALS_FLAG] && !isAutoEqualsToggleCell(cell as KeyCell)) {
        dispatch({ type: "TOGGLE_FLAG", flag: AUTO_EQUALS_FLAG });
      }
      queueToggleAnimation(root, state, cell as KeyCell);
      dispatch(buildKeyButtonAction(state, cell as KeyCell));
    });
    keysEl.appendChild(button);
  }
};
