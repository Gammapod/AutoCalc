import type { Action, GameState, KeyCell } from "../../../domain/types.js";
import { STORAGE_COLUMNS } from "../../../domain/state.js";
import {
  BINARY_MODE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
  STEP_EXPANSION_FLAG,
} from "../../../domain/state.js";
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
  type StorageFilterSelection,
} from "./viewModel.js";
import { bindDraggableCell } from "../input/dragDrop.js";
import { getStorageModuleState } from "./runtime.js";

const STORAGE_MIN_VISUAL_COLUMNS = 1;
const STORAGE_MAX_VISUAL_COLUMNS = 10;
const STORAGE_MIN_KEY_WIDTH_PX = 56;
const STORAGE_FALLBACK_GAP_PX = 8;
const STORAGE_WORKSPACE_GAP_PX = 8;

const STORAGE_SORT_SEGMENTS: Array<{ label: string; group: StorageFilterSelection; ariaLabel: string }> = [
  { label: "\u22c3", group: "all", ariaLabel: "All keys" },
  { label: "\u00d7", group: "slot_operator", ariaLabel: "Operator keys" },
  { label: "#", group: "value_expression", ariaLabel: "Digit keys" },
  { label: "=", group: "execution", ariaLabel: "Execution keys" },
  { label: "\u2699", group: "settings", ariaLabel: "Settings and visualizer keys" },
  { label: "C", group: "utility_bundle", ariaLabel: "Utility, memory, and system keys" },
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

const buildStorageSlotLabels = (count: number, columns: number): string[] =>
  Array.from({ length: count }, (_unused, index) => {
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
    return STORAGE_MAX_VISUAL_COLUMNS;
  }
  const slotCount = Number.parseInt(storageEl.dataset.storageSlotCount ?? "0", 10);
  const computed = window.getComputedStyle(storageEl);
  const gap = parsePixelValue(computed.columnGap || computed.gap, STORAGE_FALLBACK_GAP_PX);
  const paddingLeft = parsePixelValue(computed.paddingLeft, 0);
  const paddingRight = parsePixelValue(computed.paddingRight, 0);
  const contentWidth = Math.max(0, storageEl.clientWidth - paddingLeft - paddingRight);
  const measuredColumns = contentWidth > 0
    ? Math.floor((contentWidth + gap) / (STORAGE_MIN_KEY_WIDTH_PX + gap))
    : STORAGE_MAX_VISUAL_COLUMNS;
  const maxColumns = Math.min(STORAGE_MAX_VISUAL_COLUMNS, Math.max(1, slotCount || 1));
  return Math.max(STORAGE_MIN_VISUAL_COLUMNS, Math.min(maxColumns, measuredColumns));
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

const resolveStorageWorkspaceHost = (root: Element): HTMLElement | null => {
  if (root instanceof HTMLElement && root.id === "app") {
    return root;
  }
  return root.querySelector<HTMLElement>("#app");
};

const syncStorageWorkspaceInset = (root: Element, storageShell: HTMLElement | null): void => {
  const host = resolveStorageWorkspaceHost(root);
  if (!host) {
    return;
  }
  if (!storageShell || storageShell.hidden) {
    host.style.setProperty("--storage-drawer-height", "0px");
    return;
  }
  if (storageShell.dataset.storageMode === "browse") {
    host.style.setProperty("--storage-drawer-height", "0px");
    return;
  }
  const height = Math.ceil(storageShell.getBoundingClientRect().height + STORAGE_WORKSPACE_GAP_PX);
  host.style.setProperty("--storage-drawer-height", `${Math.max(0, height).toString()}px`);
};

const ensureStorageShellObserver = (root: Element, storageShell: HTMLElement | null): void => {
  const state = getStorageModuleState(root);
  if (!storageShell || typeof ResizeObserver === "undefined") {
    syncStorageWorkspaceInset(root, storageShell);
    return;
  }
  if (!state.storageShellResizeObserver) {
    state.storageShellResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target;
        if (target instanceof HTMLElement) {
          syncStorageWorkspaceInset(root, target);
        }
      }
    });
  }
  if (state.observedStorageShell === storageShell) {
    syncStorageWorkspaceInset(root, storageShell);
    return;
  }
  if (state.observedStorageShell) {
    state.storageShellResizeObserver.unobserve(state.observedStorageShell);
  }
  state.observedStorageShell = storageShell;
  state.storageShellResizeObserver.observe(storageShell);
  syncStorageWorkspaceInset(root, storageShell);
};

const toStorageCell = (key: KeyCell["key"]): KeyCell => {
  if (key === "toggle_delta_range_clamp") {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } };
  }
  if (key === "toggle_mod_zero_to_delta") {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } };
  }
  if (key === "toggle_step_expansion") {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: STEP_EXPANSION_FLAG } };
  }
  if (key === "toggle_binary_mode") {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: BINARY_MODE_FLAG } };
  }
  if (key === "exec_play_pause") {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } };
  }
  return { kind: "key", key };
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
  const storageShell = root.querySelector<HTMLElement>(".storage");
  const storageBrowseMode = Boolean(state.ui.buttonFlags["mode.storage_browse"]);
  if (storageShell) {
    storageShell.dataset.storageMode = storageBrowseMode ? "browse" : "standard";
  }
  ensureStorageShellObserver(root, storageShell);
  const storageSortControlsEl = root.querySelector<HTMLElement>("[data-storage-sort-controls]");
  const storageModeToggleButton = root.querySelector<HTMLButtonElement>("[data-storage-mode-toggle]");
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
    if (storageModeToggleButton) {
      storageModeToggleButton.textContent = "Browse";
      storageModeToggleButton.disabled = true;
      storageModeToggleButton.setAttribute("aria-pressed", "false");
      storageModeToggleButton.onclick = null;
    }
    syncStorageWorkspaceInset(root, storageShell);
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
  if (storageModeToggleButton) {
    storageModeToggleButton.textContent = storageBrowseMode ? "Standard" : "Browse";
    storageModeToggleButton.disabled = options.inputBlocked;
    storageModeToggleButton.setAttribute("aria-pressed", storageBrowseMode ? "true" : "false");
    storageModeToggleButton.onclick = () => {
      if (options.inputBlocked) {
        return;
      }
      dispatch({ type: "TOGGLE_FLAG", flag: "mode.storage_browse" });
    };
  }

  if (storageSortControlsEl) {
    const activeStorageSortGroup = getActiveStorageSortGroup(state);
    storageSortControlsEl.innerHTML = "";
    for (const segment of STORAGE_SORT_SEGMENTS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "storage-sort-button";
      const isActive = segment.group === "all" ? activeStorageSortGroup === null : activeStorageSortGroup === segment.group;
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

  const storageRenderOrder = buildStorageRenderOrder(state);
  storageEl.dataset.storageSlotCount = storageRenderOrder.length.toString();
  ensureStorageGridObserver(root, storageEl);
  const storageColumns = syncStorageGridMetrics(storageEl);
  const storageLabels = buildStorageSlotLabels(storageRenderOrder.length, storageColumns);
  for (let index = 0; index < storageRenderOrder.length; index += 1) {
    const key = storageRenderOrder[index];
    const cell = toStorageCell(key);
    const slotLabel = storageLabels[index] ?? `S#${index}`;
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
  syncStorageWorkspaceInset(root, storageShell);
};



