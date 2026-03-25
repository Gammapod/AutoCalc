import type { Action, GameState, KeyCell } from "../../../domain/types.js";
import { STORAGE_COLUMNS } from "../../../domain/state.js";
import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import { getButtonDefinition } from "../../../domain/buttonRegistry.js";
import { resolveKeyId } from "../../../domain/keyPresentation.js";
import { getKeyVisualGroup } from "../calculator/dom.js";
import { formatKeyCellLabel, getToggleAnimationIdForCell, isToggleFlagActive } from "../calculatorStorageCore.js";
import { readToggleAnimation as readToggleAnimationById } from "../calculator/runtime.js";
import {
  buildStorageRenderOrder,
  buildStorageSortToggleSequence,
  getActiveStorageSortGroup,
  getStorageRowCount,
} from "./viewModel.js";
import { bindDraggableCell, bindDropTargetCell } from "../input/dragDrop.js";
import { getStorageModuleState } from "./runtime.js";

const STORAGE_MIN_VISUAL_COLUMNS = 1;
const STORAGE_MIN_KEY_WIDTH_PX = 56;
const STORAGE_FALLBACK_GAP_PX = 8;

const STORAGE_SORT_SEGMENTS: Array<{ label: string; group: ReturnType<typeof getKeyVisualGroup>; ariaLabel: string }> = [
  { label: "=", group: "execution", ariaLabel: "Execution keys" },
  { label: "\u{1D45B}", group: "value_expression", ariaLabel: "Value expression keys" },
  { label: "\u2A02", group: "slot_operator", ariaLabel: "Operator keys" },
  { label: "\u23CF", group: "utility", ariaLabel: "Utility keys" },
  { label: "\u2699", group: "settings", ariaLabel: "Settings keys" },
  { label: "SYS", group: "global_system", ariaLabel: "Global system keys" },
  { label: "M", group: "memory", ariaLabel: "Memory keys" },
  { label: "\u25B6", group: "step", ariaLabel: "Step keys" },
  { label: "\u2191__", group: "visualizers", ariaLabel: "Visualizer keys" },
];

const appendDebugSlotLabel = (cellElement: HTMLElement, label: string): void => {
  const slotLabel = document.createElement("span");
  slotLabel.className = "slot-label";
  slotLabel.setAttribute("aria-hidden", "true");
  slotLabel.textContent = label;
  cellElement.appendChild(slotLabel);
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
  const availableWidth = Math.max(1, contentWidth - 6 * 2);
  const measuredWidth = labelEl.getBoundingClientRect().width;
  const naturalWidth = Math.max(1, Math.ceil(measuredWidth || labelEl.scrollWidth));
  if (naturalWidth <= availableWidth + 2) {
    return;
  }
  const scale = Math.max(0.01, availableWidth / naturalWidth);
  labelEl.style.transform = `scaleX(${scale.toFixed(4)})`;
};

const fitKeyLabelsInContainer = (container: ParentNode): void => {
  const buttons = container.querySelectorAll<HTMLButtonElement>(".key");
  buttons.forEach((button) => fitKeyButtonLabel(button));
};

const buildStorageSlotLabels = (layout: GameState["ui"]["storageLayout"], columns: number): string[] =>
  layout.map((_cell, index) => {
    const row = Math.floor(index / columns) + 1;
    const column = (index % columns) + 1;
    return `S${row}C${column} #${index}`;
  });

const parsePixelValue = (value: string | null | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStorageVisualColumns = (storageEl: HTMLElement): number => {
  if (typeof window === "undefined") {
    return STORAGE_COLUMNS;
  }
  const computed = window.getComputedStyle(storageEl);
  const gap = parsePixelValue(computed.columnGap || computed.gap, STORAGE_FALLBACK_GAP_PX);
  const paddingLeft = parsePixelValue(computed.paddingLeft, 0);
  const paddingRight = parsePixelValue(computed.paddingRight, 0);
  const contentWidth = Math.max(0, storageEl.clientWidth - paddingLeft - paddingRight);
  if (contentWidth <= 0) {
    return STORAGE_COLUMNS;
  }
  const columns = Math.floor((contentWidth + gap) / (STORAGE_MIN_KEY_WIDTH_PX + gap));
  return Math.max(STORAGE_MIN_VISUAL_COLUMNS, Math.min(STORAGE_COLUMNS, columns));
};

const syncStorageGridMetrics = (storageEl: HTMLElement): number => {
  const columns = getStorageVisualColumns(storageEl);
  storageEl.style.setProperty("--storage-columns", columns.toString());
  storageEl.setAttribute("data-storage-columns", columns.toString());
  const slotCount = Number.parseInt(storageEl.dataset.storageSlotCount ?? "0", 10);
  const rowCount = getStorageRowCount(slotCount, columns);
  storageEl.setAttribute("data-storage-rows", rowCount.toString());
  storageEl.style.setProperty("--storage-rows", rowCount.toString());
  return columns;
};

const ensureStorageGridObserver = (root: Element, storageEl: HTMLElement): void => {
  const state = getStorageModuleState(root);
  if (typeof ResizeObserver === "undefined") {
    return;
  }
  if (!state.storageGridResizeObserver) {
    state.storageGridResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target;
        if (target instanceof HTMLElement) {
          syncStorageGridMetrics(target);
        }
      }
    });
  }
  if (state.observedStorageGrid === storageEl) {
    return;
  }
  if (state.observedStorageGrid) {
    state.storageGridResizeObserver.unobserve(state.observedStorageGrid);
  }
  state.observedStorageGrid = storageEl;
  state.storageGridResizeObserver.observe(storageEl);
};

const renderStorageButton = (
  root: Element,
  storageEl: HTMLElement,
  state: GameState,
  dispatch: (action: Action) => unknown,
  cell: KeyCell,
  index: number,
  slotLabel: string,
  storageLocked: boolean,
  newlyUnlockedKeys: Set<string>,
): void => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "key key--storage key--storage-unlocked key--draggable";
  button.classList.add(`key--group-${getKeyVisualGroup(cell.key)}`);
  if (getButtonDefinition(resolveKeyId(cell.key))?.unlockGroup === "unaryOperators") {
    button.classList.add("key--unary-operator");
  }
  if (newlyUnlockedKeys.has(cell.key)) {
    button.classList.add("key--unlock-animate");
  }
  setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
  const storageToggleActive = isToggleFlagActive(state, cell);
  button.classList.toggle("key--toggle-active", storageToggleActive);
  const toggleAnimationId = getToggleAnimationIdForCell(cell);
  const storageToggleAnimation = toggleAnimationId ? readToggleAnimationById(root, toggleAnimationId) : null;
  if (storageToggleAnimation === "on") {
    button.classList.add("key--toggle-animate-on");
  } else if (storageToggleAnimation === "off") {
    button.classList.add("key--toggle-animate-off");
  }
  button.setAttribute("aria-pressed", storageToggleActive ? "true" : "false");
  button.disabled = storageLocked;
  button.dataset.key = cell.key;
  bindDraggableCell(root, button, state, dispatch, { surface: "storage", index }, cell.key);
  appendDebugSlotLabel(button, slotLabel);
  storageEl.appendChild(button);
};

export const renderStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    inputBlocked: boolean;
    newlyUnlockedKeys?: Set<string>;
  },
): void => {
  const storageEl = root.querySelector<HTMLElement>("[data-storage-keys]");
  if (!storageEl) {
    throw new Error("Storage UI mount point is missing.");
  }
  const storageSortControlsEl = root.querySelector<HTMLElement>("[data-storage-sort-controls]");
  const isMainMenuMode = Boolean(state.ui.buttonFlags["mode.main_menu"]);
  const storageContentVisible = state.ui.buttonFlags["mode.storage_content_visible"] ?? !isMainMenuMode;
  if (!storageContentVisible) {
    storageEl.dataset.storageLocked = "true";
    storageEl.innerHTML = "";
    storageEl.setAttribute("aria-hidden", "true");
    storageEl.setAttribute("data-storage-visible", "false");
    if (storageSortControlsEl) {
      storageSortControlsEl.innerHTML = "";
    }
    return;
  }
  const storageLocked = options.inputBlocked;
  const runtimeState = getStorageModuleState(root);
  const currentSnapshot: Record<string, boolean> = {
    ...state.unlocks.valueAtoms,
    ...state.unlocks.valueCompose,
    ...state.unlocks.valueExpression,
    ...state.unlocks.slotOperators,
    ...state.unlocks.unaryOperators,
    ...state.unlocks.utilities,
    ...state.unlocks.memory,
    ...state.unlocks.steps,
    ...state.unlocks.visualizers,
    ...state.unlocks.execution,
  };
  const derivedNewlyUnlocked = new Set<string>();
  if (runtimeState.previousUnlockSnapshot) {
    for (const [key, unlocked] of Object.entries(currentSnapshot)) {
      if (!runtimeState.previousUnlockSnapshot[key] && unlocked) {
        derivedNewlyUnlocked.add(key);
      }
    }
  }
  runtimeState.previousUnlockSnapshot = currentSnapshot;
  const newlyUnlockedKeys = options.newlyUnlockedKeys ?? derivedNewlyUnlocked;
  storageEl.dataset.storageLocked = storageLocked ? "true" : "false";
  storageEl.innerHTML = "";
  storageEl.setAttribute("aria-hidden", "false");
  storageEl.setAttribute("data-storage-visible", "true");

  if (storageSortControlsEl) {
    const activeStorageSortGroup = getActiveStorageSortGroup(state);
    storageSortControlsEl.innerHTML = "";
    for (const segment of STORAGE_SORT_SEGMENTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "storage-sort-button";
      const isActive = activeStorageSortGroup === segment.group;
      button.textContent = segment.label;
      button.dataset.storageSortGroup = segment.group;
      button.setAttribute("aria-label", segment.ariaLabel);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (isActive) {
        button.classList.add("storage-sort-button--active");
      }
      button.disabled = options.inputBlocked;
      button.addEventListener("click", () => {
        if (options.inputBlocked || isActive) {
          return;
        }
        for (const action of buildStorageSortToggleSequence(state, segment.group)) {
          dispatch(action);
        }
      });
      storageSortControlsEl.appendChild(button);
    }
  }

  storageEl.dataset.storageSlotCount = state.ui.storageLayout.length.toString();
  ensureStorageGridObserver(root, storageEl);
  const storageColumns = syncStorageGridMetrics(storageEl);
  const storageLabels = buildStorageSlotLabels(state.ui.storageLayout, storageColumns);
  const storageRenderOrder = buildStorageRenderOrder(state);
  for (const index of storageRenderOrder) {
    const cell = state.ui.storageLayout[index];
    const slotLabel = storageLabels[index] ?? `S#${index}`;
    if (!cell) {
      const empty = document.createElement("div");
      empty.className = "placeholder placeholder--drop-slot placeholder--storage-empty";
      empty.setAttribute("aria-hidden", "true");
      bindDropTargetCell(empty, "storage", index);
      empty.dataset.layoutOccupied = "empty";
      appendDebugSlotLabel(empty, slotLabel);
      storageEl.appendChild(empty);
      continue;
    }
    if (!isKeyUnlocked(state, cell.key)) {
      const hidden = document.createElement("div");
      hidden.className = "placeholder placeholder--drop-slot placeholder--storage-empty placeholder--locked-hidden";
      hidden.setAttribute("aria-hidden", "true");
      appendDebugSlotLabel(hidden, slotLabel);
      storageEl.appendChild(hidden);
      continue;
    }
    renderStorageButton(
      root,
      storageEl,
      state,
      dispatch,
      cell,
      index,
      slotLabel,
      storageLocked,
      newlyUnlockedKeys,
    );
  }
  fitKeyLabelsInContainer(storageEl);
};



