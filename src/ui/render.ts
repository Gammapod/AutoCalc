import { unlockCatalog } from "../content/unlocks.catalog.js";
import { calculatorValueToDisplayString, isRationalCalculatorValue } from "../domain/calculatorValue.js";
import { isKeyUnlocked } from "../domain/keyUnlocks.js";
import { STORAGE_COLUMNS } from "../domain/state.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../domain/keypadLayoutModel.js";
import { evaluateLayoutDrop } from "../domain/layoutRules.js";
import {
  buildStepBodyHighlightRegions,
  resolveStepBodyHighlightRects,
} from "./stepHighlight.js";
import {
  buildOperationSlotDisplay as buildOperationSlotDisplayShared,
  buildRollLines as buildRollLinesShared,
  buildRollRows as buildRollRowsShared,
  buildRollViewModel as buildRollViewModelShared,
  buildVisibleChecklistRows as buildVisibleChecklistRowsShared,
  buildUnlockRows as buildUnlockRowsShared,
  formatKeyLabel as formatKeyLabelShared,
  formatOperatorForDisplay as formatOperatorForDisplayShared,
  getKeyVisualGroup as getKeyVisualGroupShared,
  type KeyVisualGroup,
} from "./shared/renderReadModel.js";
import type {
  Action,
  CalculatorValue,
  CalculatorState,
  EuclidRemainderEntry,
  GameState,
  KeyButtonBehavior,
  KeyCell,
  Key,
  LayoutSurface,
  RollErrorEntry,
  SlotOperator,
  VisualizerId,
} from "../domain/types.js";
import { toDisplayString } from "../infra/math/rationalEngine.js";
import { toPreferredFractionString } from "../infra/math/euclideanEngine.js";

const MAX_UNLOCKED_TOTAL_DIGITS = 12;
const SEGMENT_NAMES = ["a", "b", "c", "d", "e", "f", "g"] as const;
type SegmentName = (typeof SEGMENT_NAMES)[number];

type TotalSlotModel = {
  state: "locked" | "unlocked" | "active";
  digit: string | null;
  activeSegments: readonly SegmentName[];
};

type RollRow = {
  prefix: string;
  value: string;
  remainder?: string;
  errorCode?: string;
  graphPointIndex?: number;
};

type RollViewModel = {
  rows: RollRow[];
  isVisible: boolean;
  lineCount: number;
  valueColumnChars: number;
};

export type GraphPoint = {
  x: number;
  y: number;
  hasError: boolean;
};

type GraphDataset = {
  data: GraphPoint[];
  showLine: boolean;
  pointRadius: number;
  pointHoverRadius: number;
  pointBackgroundColor: string | string[];
  pointBorderColor: string | string[];
  pointBorderWidth: number;
};

type GraphScale = {
  display?: boolean;
  min?: number;
  max?: number;
  ticks?: {
    color?: string;
    precision?: number;
    autoSkip?: boolean;
    callback?: (value: string | number, index?: number, ticks?: Array<{ value: number }>) => string | number;
  };
  grid?: {
    color?: string | ((context: { tick?: { value?: number | string } }) => string);
    lineWidth?: number | ((context: { tick?: { value?: number | string } }) => number);
    display?: boolean;
  };
  border?: {
    color?: string;
    display?: boolean;
  };
};

type GraphOptions = {
  animation: boolean;
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
    };
    tooltip: {
      enabled: boolean;
    };
  };
  scales: {
    x: GraphScale;
    y: GraphScale;
  };
};

type GraphChartConfig = {
  type: "scatter";
  data: {
    datasets: GraphDataset[];
  };
  options: GraphOptions;
};

type ChartHandle = {
  data: {
    datasets: GraphDataset[];
  };
  options: GraphOptions;
  update: (mode?: "none") => void;
  destroy: () => void;
};

type ChartCtor = new (ctx: CanvasRenderingContext2D, config: GraphChartConfig) => ChartHandle;

declare global {
  interface Window {
    Chart?: ChartCtor;
  }
}

let previousUnlockSnapshot: Record<Key, boolean> | null = null;
let pendingToggleAnimationByFlag: Record<string, "on" | "off"> = {};
let previousKeypadColumns: number | null = null;
let previousKeypadRows: number | null = null;
let graphChart: ChartHandle | null = null;
let graphCanvas: HTMLCanvasElement | null = null;
let dragSession: DragSession | null = null;
let storageGridResizeObserver: ResizeObserver | null = null;
let observedStorageGrid: HTMLElement | null = null;
let suppressClicksUntil = 0;
let inputAnimationLockCount = 0;
const GRAPH_WINDOW_SIZE = 25;
const DRAG_START_THRESHOLD_PX = 6;
const DRAG_CLICK_SUPPRESS_MS = 220;
const INPUT_LOCK_FALLBACK_BUFFER_MS = 80;
const UNLOCK_ANIMATION_DURATION_MS = 1200;
const KEYPAD_SLOT_ENTER_DURATION_MS = 760;
const KEYPAD_GROW_MAX_DURATION_MS = 880;
const CALC_GROW_MAX_DURATION_MS = 980;
const QUICK_TAP_PRESS_MIN_VISIBLE_MS = 55;
const PROGRAMMATIC_PRESS_MIN_VISIBLE_MS = 140;
const UNLOCK_ANIMATION_NAME = "key-unlock-pulse";
const KEYPAD_SLOT_ENTER_ANIMATION_NAME = "keypad-slot-enter";
const STEP_BODY_HIGHLIGHT_CLASS = "keypad-step-body-highlight";
const STORAGE_MIN_VISUAL_COLUMNS = 1;
const STORAGE_MIN_KEY_WIDTH_PX = 56;
const STORAGE_FALLBACK_GAP_PX = 8;
const KEY_LABEL_INLINE_GUTTER_PX = 6;
const KEY_LABEL_SQUISH_THRESHOLD_PX = 2;

let keyLabelResizeBound = false;

export type UnlockRowState = "not_completed" | "completed" | "impossible";

export type UnlockCriterionVm = {
  label: string;
  checked: boolean;
};

export type UnlockRowVm = {
  id: string;
  name: string;
  state: UnlockRowState;
  criteria: UnlockCriterionVm[];
  difficulty?: "difficult";
  difficultyLabel?: "Difficult";
};

type DropAction = "move" | "swap";
type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

type DragSession = {
  state: GameState;
  dispatch: (action: Action) => unknown;
  source: DragTarget;
  key: Key;
  originElement: HTMLElement;
  originX: number;
  originY: number;
  ghost: HTMLElement | null;
  active: boolean;
  target: DragTarget | null;
  targetAction: DropAction | null;
  targetElement: HTMLElement | null;
};

const DIGIT_SEGMENTS: Record<string, readonly SegmentName[]> = {
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
};

export const formatOperatorForDisplay = (operator: SlotOperator): string =>
  formatOperatorForDisplayShared(operator);

const formatOperatorForOperationSlotDisplay = (operator: SlotOperator): string =>
  operator === "\u27E1" ? "\u2662" : formatOperatorForDisplayShared(operator);

export const formatKeyLabel = (key: Key): string => {
  return formatKeyLabelShared(key);
};

const PRESS_KEY_BEHAVIOR: KeyButtonBehavior = { type: "press_key" };
const STORAGE_SORT_FLAG_BY_GROUP: Record<KeyVisualGroup, string> = {
  execution: "storage.sort.execution",
  value_expression: "storage.sort.value_expression",
  slot_operator: "storage.sort.slot_operator",
  utility: "storage.sort.utility",
  step: "storage.sort.step",
  visualizers: "storage.sort.visualizers",
};
const STORAGE_SORT_SEGMENTS: Array<{ label: string; group: KeyVisualGroup; ariaLabel: string }> = [
  { label: "=", group: "execution", ariaLabel: "Execution keys" },
  { label: "\u{1D45B}", group: "value_expression", ariaLabel: "Value expression keys" },
  { label: "\u2A02", group: "slot_operator", ariaLabel: "Operator keys" },
  { label: "\u23CF", group: "utility", ariaLabel: "Utility keys" },
  { label: "\u25B6", group: "step", ariaLabel: "Step keys" },
  { label: "\u2191__", group: "visualizers", ariaLabel: "Visualizer keys" },
];

const getStorageSortFlag = (group: KeyVisualGroup): string => STORAGE_SORT_FLAG_BY_GROUP[group];

export const getActiveStorageSortGroup = (state: GameState): KeyVisualGroup | null => {
  for (const segment of STORAGE_SORT_SEGMENTS) {
    if (Boolean(state.ui.buttonFlags[getStorageSortFlag(segment.group)])) {
      return segment.group;
    }
  }
  return null;
};

export const buildStorageSortToggleSequence = (
  state: GameState,
  targetGroup: KeyVisualGroup,
): Action[] => {
  const targetFlag = getStorageSortFlag(targetGroup);
  const actions: Action[] = [];
  if (!Boolean(state.ui.buttonFlags[targetFlag])) {
    actions.push({ type: "TOGGLE_FLAG", flag: targetFlag });
  }
  for (const segment of STORAGE_SORT_SEGMENTS) {
    const flag = getStorageSortFlag(segment.group);
    if (flag === targetFlag) {
      continue;
    }
    if (Boolean(state.ui.buttonFlags[flag])) {
      actions.push({ type: "TOGGLE_FLAG", flag });
    }
  }
  return actions;
};

const getButtonFlag = (state: GameState, flag: string): boolean => {
  return Boolean(state.ui.buttonFlags[flag]);
};

const visualizerForKey = (key: KeyCell["key"]): VisualizerId | null => {
  if (key === "GRAPH") {
    return "graph";
  }
  if (key === "FEED") {
    return "feed";
  }
  if (key === "CIRCLE") {
    return "circle";
  }
  return null;
};

export const getKeyButtonBehavior = (cell: KeyCell): KeyButtonBehavior => {
  return cell.behavior ?? PRESS_KEY_BEHAVIOR;
};

export const isToggleFlagActive = (state: GameState, cell: KeyCell): boolean => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return state.ui.activeVisualizer === visualizer;
  }
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" ? getButtonFlag(state, behavior.flag) : false;
};

export const formatKeyCellLabel = (state: GameState, cell: KeyCell): string => {
  if (cell.key === "\u23EF") {
    return isToggleFlagActive(state, cell) ? "\u275A\u275A" : "\u25BA";
  }
  return formatKeyLabel(cell.key);
};

export const buildKeyButtonAction = (state: GameState, cell: KeyCell): Action => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return { type: "TOGGLE_VISUALIZER", visualizer };
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type === "toggle_flag") {
    return { type: "TOGGLE_FLAG", flag: behavior.flag };
  }
  return { type: "PRESS_KEY", key: cell.key };
};

const queueToggleAnimation = (state: GameState, cell: KeyCell): void => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    pendingToggleAnimationByFlag[visualizer] = state.ui.activeVisualizer === visualizer ? "off" : "on";
    return;
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return;
  }
  pendingToggleAnimationByFlag[behavior.flag] = isToggleFlagActive(state, cell) ? "off" : "on";
};

const readToggleAnimation = (cell: KeyCell): "on" | "off" | null => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return pendingToggleAnimationByFlag[visualizer] ?? null;
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return null;
  }
  return pendingToggleAnimationByFlag[behavior.flag] ?? null;
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

const refitAllVisibleKeyLabels = (): void => {
  const keypad = document.querySelector<HTMLElement>("[data-keys]");
  if (keypad) {
    fitKeyLabelsInContainer(keypad);
  }
  const storage = document.querySelector<HTMLElement>("[data-storage-keys]");
  if (storage) {
    fitKeyLabelsInContainer(storage);
  }
};

const ensureKeyLabelResizeListener = (): void => {
  if (keyLabelResizeBound) {
    return;
  }
  keyLabelResizeBound = true;
  window.addEventListener("resize", () => {
    refitAllVisibleKeyLabels();
  });
};

const clampUnlockedDigits = (value: number): number =>
  Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, value));

export const buildTotalSlotModel = (total: CalculatorValue, unlockedDigits: number): TotalSlotModel[] => {
  const numericTotal = isRationalCalculatorValue(total) ? total.value : { num: 0n, den: 1n };
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const magnitude = numericTotal.num < 0n ? -numericTotal.num : numericTotal.num;
  const renderedDigits = magnitude.toString().slice(-clampedUnlocked);
  const leadingUnlockedCount = clampedUnlocked - renderedDigits.length;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_UNLOCKED_TOTAL_DIGITS; index += 1) {
    if (index < lockedCount) {
      slots.push({
        state: "locked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const unlockedIndex = index - lockedCount;
    if (unlockedIndex < leadingUnlockedCount) {
      slots.push({
        state: "unlocked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const digit = renderedDigits[unlockedIndex - leadingUnlockedCount];
    slots.push({
      state: "active",
      digit,
      activeSegments: DIGIT_SEGMENTS[digit] ?? [],
    });
  }

  return slots;
};

export const buildClearedTotalSlotModel = (unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_UNLOCKED_TOTAL_DIGITS; index += 1) {
    if (index < lockedCount) {
      slots.push({
        state: "locked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    slots.push({
      state: "unlocked",
      digit: null,
      activeSegments: [],
    });
  }

  if (slots.length > 0) {
    slots[slots.length - 1] = {
      state: "active",
      digit: "_",
      activeSegments: ["d"],
    };
  }

  return slots;
};

export const isClearedCalculatorState = (calculator: CalculatorState): boolean =>
  isRationalCalculatorValue(calculator.total) &&
  calculator.total.value.num === 0n &&
  calculator.total.value.den === 1n &&
  !calculator.pendingNegativeTotal &&
  calculator.roll.length === 0 &&
  calculator.rollErrors.length === 0 &&
  calculator.euclidRemainders.length === 0 &&
  calculator.operationSlots.length === 0 &&
  calculator.draftingSlot === null;

export const buildRollLines = (roll: CalculatorValue[]): string[] => {
  return buildRollLinesShared(roll);
};

export const buildRollRows = (
  rollLines: string[],
  euclidRemainders: EuclidRemainderEntry[] = [],
  rollErrors: RollErrorEntry[] = [],
): RollRow[] => {
  return buildRollRowsShared(rollLines, euclidRemainders, rollErrors);
};

export const buildRollViewModel = (
  roll: CalculatorValue[],
  euclidRemainders: EuclidRemainderEntry[] = [],
  rollErrors: RollErrorEntry[] = [],
): RollViewModel => {
  return buildRollViewModelShared(roll, euclidRemainders, rollErrors);
};

export const getRollLineClassName = (row: RollRow): string =>
  row.remainder || row.errorCode ? "roll-line roll-line--with-remainder" : "roll-line";

export const buildGraphPoints = (roll: CalculatorValue[], rollErrors: RollErrorEntry[] = []): GraphPoint[] => {
  const errorByRollIndex = new Map<number, string>();
  for (const entry of rollErrors) {
    errorByRollIndex.set(entry.rollIndex, entry.code);
  }
  const seenErrorCodes = new Set<string>();
  const points: GraphPoint[] = [];
  for (let index = 0; index < roll.length; index += 1) {
    const errorCode = errorByRollIndex.get(index);
    if (errorCode && seenErrorCodes.has(errorCode)) {
      continue;
    }
    if (errorCode) {
      seenErrorCodes.add(errorCode);
    }
    const value = roll[index];
    if (!isRationalCalculatorValue(value)) {
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: Boolean(errorCode),
    });
  }
  return points;
};

export const isGraphVisible = (roll: CalculatorValue[]): boolean => roll.length > 0;

export const buildOperationSlotDisplay = (state: GameState): string => {
  return buildOperationSlotDisplayShared(state);
};
export const buildUnlockRows = (...args: Parameters<typeof buildUnlockRowsShared>): UnlockRowVm[] => buildUnlockRowsShared(...args);
export const buildVisibleChecklistRows = (...args: Parameters<typeof buildVisibleChecklistRowsShared>) =>
  buildVisibleChecklistRowsShared(...args);

export const isChecklistUnlocked = (_state: GameState): boolean => true;

const appendChecklistQuickstartGuide = (container: Element): void => {
  const guideEl = document.createElement("div");
  guideEl.className = "debug-guide";
  guideEl.setAttribute("aria-label", "Feature overview");

  const titleEl = document.createElement("p");
  titleEl.className = "debug-guide-title";
  titleEl.textContent = "Feature Overview";
  guideEl.appendChild(titleEl);

  const listEl = document.createElement("ol");
  listEl.className = "debug-guide-list";
  listEl.innerHTML = `
    <li>Make calculations to unlock more convenient calculator keys.</li>
    <li>Hold down "MODIFY CALCULATOR" for 1.5 seconds to edit calculator.</li>
    <li>Drag+Drop keys to rearrange and modify layout.</li>
    <li>
      Allocator can change:
      <ul class="debug-guide-sublist">
        <li>Size of calculator keypad</li>
        <li>Range of total display</li>
        <li>Number of operations per function</li>
        <li>Speed of auto-clicker</li>
      </ul>
    </li>
  `;
  guideEl.appendChild(listEl);
  container.appendChild(guideEl);
};

const renderUnlockChecklist = (unlockEl: Element, state: GameState): void => {
  unlockEl.setAttribute("data-checklist-state", "open");
  unlockEl.setAttribute("data-checklist-animate", "false");
  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = "Unlocks";
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const hintHeader = document.createElement("span");
  hintHeader.textContent = "Hint";
  const rewardHeader = document.createElement("span");
  rewardHeader.textContent = "Reward";
  header.append(hintHeader, rewardHeader);
  unlockEl.appendChild(header);

  const rows = buildVisibleChecklistRows(state, { catalog: unlockCatalog });
  const hintByUnlockId = new Map(unlockCatalog.map((unlock) => [unlock.id, unlock.description]));
  if (rows.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "unlock-empty-state";
    emptyStateEl.textContent = "No currently attemptable unlocks from active keypad layout.";
    unlockEl.appendChild(emptyStateEl);
  } else {
    for (const row of rows) {
      const rowEl = document.createElement("div");
      rowEl.className = "unlock-row";
      if (row.state === "completed") {
        rowEl.classList.add("unlock-row--completed");
      }

      const hintEl = document.createElement("span");
      hintEl.className = "unlock-hint";
      if (row.difficulty === "difficult") {
        const difficultyLabel = document.createElement("span");
        difficultyLabel.className = "unlock-difficulty";
        difficultyLabel.textContent = row.difficultyLabel ?? "Difficult";
        hintEl.appendChild(difficultyLabel);
        hintEl.appendChild(document.createTextNode(" "));
      }
      hintEl.appendChild(document.createTextNode(hintByUnlockId.get(row.id) ?? ""));
      rowEl.appendChild(hintEl);

      const nameEl = document.createElement("span");
      nameEl.className = "unlock-name";
      nameEl.textContent = row.name;
      rowEl.appendChild(nameEl);

      unlockEl.appendChild(rowEl);
    }
  }
  appendChecklistQuickstartGuide(unlockEl);
};

const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const rationalTotal = isRationalCalculatorValue(state.calculator.total) ? state.calculator.total.value : null;
  const hasRationalTotal = rationalTotal !== null;
  const hasIntegerTotal = hasRationalTotal && rationalTotal.den === 1n;
  const hasAnyKeyPress = Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);
  const shouldRenderClearedPlaceholder =
    isClearedCalculatorState(state.calculator) && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress);
  totalEl.innerHTML = "";
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
    totalEl.appendChild(frame);
    totalEl.setAttribute("aria-label", "Total _");
    return;
  }

  if (!hasRationalTotal) {
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = "NaN";
    totalEl.appendChild(fraction);
    totalEl.setAttribute("aria-label", "Total NaN");
    return;
  }

  const isNegative =
    hasIntegerTotal &&
    (rationalTotal.num < 0n || (rationalTotal.num === 0n && state.calculator.pendingNegativeTotal));

  if (isNegative) {
    const sign = document.createElement("div");
    sign.className = "seg-sign";
    sign.textContent = "-";
    totalEl.appendChild(sign);
  }

  if (!hasIntegerTotal) {
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = toDisplayString(rationalTotal);
    totalEl.appendChild(fraction);
    totalEl.setAttribute("aria-label", `Total ${toDisplayString(rationalTotal)}`);
    return;
  }

  const slotModels = buildTotalSlotModel(state.calculator.total, state.unlocks.maxTotalDigits);
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

  totalEl.setAttribute("aria-label", `Total ${calculatorValueToDisplayString(state.calculator.total)}`);
  totalEl.appendChild(frame);
};

export const renderChecklistModule = (root: Element, state: GameState): void => {
  const unlockEl = root.querySelector("[data-unlocks]");
  if (!unlockEl) {
    throw new Error("Checklist mount point is missing.");
  }
  renderUnlockChecklist(unlockEl, state);
};

export const buildGraphYWindow = (unlockedTotalDigits: number): { min: number; max: number } => {
  const clampedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const maxMagnitude = Math.pow(10, clampedDigits) - 1;
  return { min: -maxMagnitude, max: maxMagnitude };
};

export const buildGraphXWindow = (
  rollLength: number,
  windowSize: number = GRAPH_WINDOW_SIZE,
): { min: number; max: number } => {
  if (rollLength < windowSize) {
    return { min: 0, max: windowSize };
  }
  return { min: rollLength - windowSize, max: rollLength - 1 };
};

const buildGraphOptions = (hasPoints: boolean, points: GraphPoint[], unlockedTotalDigits: number): GraphOptions => {
  const bounds = buildGraphYWindow(unlockedTotalDigits);
  const xWindow = buildGraphXWindow(points.length);
  const makeTickLabelCallback =
    (axisMax: number) =>
    (value: string | number): string => {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        return "";
      }
      if (Math.abs(numeric - axisMax) < 1e-9) {
        return "";
      }
      const nearestFive = Math.round(numeric / 5) * 5;
      if (Math.abs(numeric - nearestFive) > 1e-6) {
        return "";
      }
      return nearestFive.toString();
    };
  return {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: hasPoints },
    },
    scales: {
      x: {
        min: hasPoints ? xWindow.min : 0,
        max: hasPoints ? xWindow.max : GRAPH_WINDOW_SIZE,
        display: hasPoints,
        ticks: {
          color: "#bcffd6",
          precision: 0,
          autoSkip: true,
          callback: makeTickLabelCallback(xWindow.max),
        },
        grid: {
          color: "rgba(188, 255, 214, 0.2)",
          display: hasPoints,
        },
        border: {
          color: "rgba(188, 255, 214, 0.45)",
          display: hasPoints,
        },
      },
      y: {
        min: bounds.min,
        max: bounds.max,
        display: true,
        ticks: {
          color: "#bcffd6",
          autoSkip: true,
          callback: makeTickLabelCallback(bounds.max),
        },
        grid: {
          color: (context: { tick?: { value?: number | string } }) => {
            const value = context.tick?.value;
            const numeric = typeof value === "number" ? value : Number(value);
            return Number.isFinite(numeric) && Math.abs(numeric) < 1e-9
              ? "rgba(188, 255, 214, 0.75)"
              : "rgba(188, 255, 214, 0.2)";
          },
          lineWidth: (context: { tick?: { value?: number | string } }) => {
            const value = context.tick?.value;
            const numeric = typeof value === "number" ? value : Number(value);
            return Number.isFinite(numeric) && Math.abs(numeric) < 1e-9 ? 2 : 1;
          },
          display: true,
        },
        border: {
          color: "rgba(188, 255, 214, 0.45)",
          display: true,
        },
      },
    },
  };
};

const destroyGraphChart = (): void => {
  graphChart?.destroy();
  graphChart = null;
  graphCanvas = null;
};

export const clearGraphModule = (): void => {
  destroyGraphChart();
};

const syncGraphVisibilityUi = (root: Element, graphVisible: boolean): void => {
  const grapherDeviceEl = root.querySelector<HTMLElement>("[data-grapher-device]");
  const displayWindowEl = root.querySelector<HTMLElement>("[data-display-window]");
  const calcRootEl = root.querySelector<HTMLElement>(".calc");
  if (displayWindowEl) {
    displayWindowEl.setAttribute("data-graph-visible", graphVisible ? "true" : "false");
  }
  if (calcRootEl) {
    calcRootEl.setAttribute("data-graph-visible", graphVisible ? "true" : "false");
  }
  if (grapherDeviceEl) {
    grapherDeviceEl.setAttribute("aria-hidden", graphVisible ? "false" : "true");
  }
};

const renderGraphDisplay = (
  root: Element,
  roll: CalculatorValue[],
  rollErrors: RollErrorEntry[],
  unlockedTotalDigits: number,
): void => {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-grapher-canvas]");
  if (!canvas) {
    destroyGraphChart();
    return;
  }

  if (graphCanvas !== canvas) {
    destroyGraphChart();
    graphCanvas = canvas;
  }

  const chartCtor = window.Chart;
  if (!chartCtor) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const points = buildGraphPoints(roll, rollErrors);
  const hasPoints = isGraphVisible(roll);
  const options = buildGraphOptions(hasPoints, points, unlockedTotalDigits);
  const pointBackgroundColor = points.map((point) => (point.hasError ? "#ff6f6f" : "#bcffd6"));
  const pointBorderColor = points.map((point) => (point.hasError ? "rgba(255, 111, 111, 0.9)" : "rgba(188, 255, 214, 0.9)"));

  if (!graphChart) {
    graphChart = new chartCtor(context, {
      type: "scatter",
      data: {
        datasets: [
          {
            data: points,
            showLine: false,
            pointRadius: hasPoints ? 3 : 0,
            pointHoverRadius: 4,
            pointBackgroundColor,
            pointBorderColor,
            pointBorderWidth: 1,
          },
        ],
      },
      options,
    });
    return;
  }

  graphChart.data.datasets[0].data = points;
  graphChart.data.datasets[0].pointRadius = hasPoints ? 3 : 0;
  graphChart.data.datasets[0].pointBackgroundColor = pointBackgroundColor;
  graphChart.data.datasets[0].pointBorderColor = pointBorderColor;
  graphChart.options = options;
  graphChart.update("none");
};

export const renderGraphModule = (root: Element, state: GameState): void => {
  const graphVisible = state.ui.activeVisualizer === "graph";
  syncGraphVisibilityUi(root, graphVisible);
  if (graphVisible) {
    renderGraphDisplay(root, state.calculator.roll, state.calculator.rollErrors, state.unlocks.maxTotalDigits);
  } else {
    destroyGraphChart();
  }
};

export const isFeedRollVisible = (state: GameState, _rollHasRows: boolean): boolean =>
  state.ui.activeVisualizer === "feed";

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  return getKeyVisualGroupShared(key);
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

export const getStorageRowCount = (buttonCount: number, columns: number = STORAGE_COLUMNS): number => {
  if (columns <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(buttonCount / columns));
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

const ensureStorageGridObserver = (storageEl: HTMLElement): void => {
  if (typeof ResizeObserver === "undefined") {
    return;
  }
  if (!storageGridResizeObserver) {
    storageGridResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target;
        if (target instanceof HTMLElement) {
          syncStorageGridMetrics(target);
        }
      }
    });
  }
  if (observedStorageGrid === storageEl) {
    return;
  }
  if (observedStorageGrid) {
    storageGridResizeObserver.unobserve(observedStorageGrid);
  }
  observedStorageGrid = storageEl;
  storageGridResizeObserver.observe(storageEl);
};

const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const isInputAnimationLocked = (): boolean => inputAnimationLockCount > 0;

export const beginInputAnimationLock = (fallbackMs: number): (() => void) => {
  inputAnimationLockCount += 1;
  let released = false;
  const release = (): void => {
    if (released) {
      return;
    }
    released = true;
    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
    inputAnimationLockCount = Math.max(0, inputAnimationLockCount - 1);
  };
  const timerId =
    typeof window !== "undefined" && fallbackMs > 0 ? window.setTimeout(release, fallbackMs) : null;
  return release;
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
      releaseLock = beginInputAnimationLock(fallbackMs + INPUT_LOCK_FALLBACK_BUFFER_MS);
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

export const buildStorageRenderOrder = (state: GameState): number[] => {
  const selectedTypeUnlocked: number[] = [];
  const otherUnlocked: number[] = [];
  const empty: number[] = [];
  const locked: number[] = [];
  const activeSortGroup = getActiveStorageSortGroup(state);

  for (let index = 0; index < state.ui.storageLayout.length; index += 1) {
    const cell = state.ui.storageLayout[index];
    if (!cell) {
      empty.push(index);
      continue;
    }
    if (isKeyUnlocked(state, cell.key)) {
      if (activeSortGroup && getKeyVisualGroup(cell.key) === activeSortGroup) {
        selectedTypeUnlocked.push(index);
      } else {
        otherUnlocked.push(index);
      }
      continue;
    }
    locked.push(index);
  }

  return [...selectedTypeUnlocked, ...otherUnlocked, ...empty, ...locked];
};

export const shouldStartDragFromDelta = (
  deltaX: number,
  deltaY: number,
  thresholdPx: number = DRAG_START_THRESHOLD_PX,
): boolean => deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

const parseDragTarget = (value: unknown): DragTarget | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const target = value as { surface?: unknown; index?: unknown };
  if ((target.surface !== "keypad" && target.surface !== "storage") || typeof target.index !== "number") {
    return null;
  }
  if (!Number.isInteger(target.index) || target.index < 0) {
    return null;
  }
  return { surface: target.surface, index: target.index };
};

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
): DropAction | null => {
  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed ? decision.action : null;
};

const findDragTargetElement = (target: DragTarget): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[data-layout-surface="${target.surface}"][data-layout-index="${target.index.toString()}"]`,
  );

const clearDragDecorations = (): void => {
  document.querySelectorAll(".drop-target-valid, .drop-target-invalid, .drag-source").forEach((node) => {
    node.classList.remove("drop-target-valid", "drop-target-invalid", "drag-source");
  });
};

const clearDragSession = (): void => {
  if (!dragSession) {
    return;
  }
  dragSession.ghost?.remove();
  clearDragDecorations();
  dragSession = null;
};

const onDragMove = (event: MouseEvent): void => {
  if (!dragSession) {
    return;
  }

  const deltaX = event.clientX - dragSession.originX;
  const deltaY = event.clientY - dragSession.originY;
  if (!dragSession.active && !shouldStartDragFromDelta(deltaX, deltaY)) {
    return;
  }

  if (!dragSession.active) {
    dragSession.active = true;
    suppressClicksUntil = Date.now() + DRAG_CLICK_SUPPRESS_MS;
    dragSession.originElement.classList.add("drag-source");
    const ghost = dragSession.originElement.cloneNode(true) as HTMLElement;
    ghost.classList.remove("drag-source", "drop-target-valid", "drop-target-invalid");
    ghost.classList.add("drag-ghost");
    ghost.style.width = `${Math.round(dragSession.originElement.getBoundingClientRect().width)}px`;
    document.body.appendChild(ghost);
    dragSession.ghost = ghost;
  }

  dragSession.ghost?.style.setProperty("left", `${event.clientX + 12}px`);
  dragSession.ghost?.style.setProperty("top", `${event.clientY + 12}px`);

  const hovered = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
  const targetNode = hovered?.closest<HTMLElement>("[data-layout-surface][data-layout-index]") ?? null;
  clearDragDecorations();
  dragSession.originElement.classList.add("drag-source");
  if (!targetNode) {
    dragSession.target = null;
    dragSession.targetAction = null;
    dragSession.targetElement = null;
    return;
  }

  const surface = targetNode.dataset.layoutSurface;
  const indexRaw = targetNode.dataset.layoutIndex;
  const parsed = parseDragTarget({ surface, index: indexRaw ? Number(indexRaw) : NaN });
  if (!parsed) {
    dragSession.target = null;
    dragSession.targetAction = null;
    dragSession.targetElement = null;
    targetNode.classList.add("drop-target-invalid");
    return;
  }

  const action = classifyDropAction(dragSession.state, dragSession.source, parsed);
  dragSession.target = parsed;
  dragSession.targetAction = action;
  dragSession.targetElement = targetNode;
  targetNode.classList.add(action ? "drop-target-valid" : "drop-target-invalid");
};

const onDragUp = (): void => {
  if (!dragSession) {
    window.removeEventListener("mousemove", onDragMove);
    return;
  }
  if (dragSession.active && dragSession.target && dragSession.targetAction) {
    if (dragSession.targetAction === "move") {
      dragSession.dispatch({
        type: "MOVE_LAYOUT_CELL",
        fromSurface: dragSession.source.surface,
        fromIndex: dragSession.source.index,
        toSurface: dragSession.target.surface,
        toIndex: dragSession.target.index,
      });
    } else {
      dragSession.dispatch({
        type: "SWAP_LAYOUT_CELLS",
        fromSurface: dragSession.source.surface,
        fromIndex: dragSession.source.index,
        toSurface: dragSession.target.surface,
        toIndex: dragSession.target.index,
      });
    }
  }
  window.removeEventListener("mousemove", onDragMove);
  clearDragSession();
};

const bindDraggableCell = (
  element: HTMLElement,
  state: GameState,
  dispatch: (action: Action) => unknown,
  source: DragTarget,
  key: Key,
): void => {
  element.dataset.layoutSurface = source.surface;
  element.dataset.layoutIndex = source.index.toString();
  element.dataset.layoutOccupied = "key";
  element.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (element instanceof HTMLButtonElement && element.disabled) {
      return;
    }
    clearDragSession();
    dragSession = {
      state,
      dispatch,
      source,
      key,
      originElement: element,
      originX: event.clientX,
      originY: event.clientY,
      ghost: null,
      active: false,
      target: null,
      targetAction: null,
      targetElement: null,
    };
    window.addEventListener("mousemove", onDragMove, { once: false });
    window.addEventListener("mouseup", onDragUp, { once: true });
  });
};

const bindQuickTapPressFeedback = (element: HTMLButtonElement): void => {
  let pressStartedAt = 0;
  let isPressedVisualActive = false;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const setPressedVisualActive = (active: boolean): void => {
    if (isPressedVisualActive === active) {
      return;
    }
    isPressedVisualActive = active;
    element.classList.toggle("key--quick-press", active);
  };

  const clearReleaseTimer = (): void => {
    if (releaseTimer === null) {
      return;
    }
    clearTimeout(releaseTimer);
    releaseTimer = null;
  };

  const beginPressVisual = (): void => {
    if (element.disabled) {
      return;
    }
    clearReleaseTimer();
    pressStartedAt = performance.now();
    setPressedVisualActive(true);
  };

  const endPressVisual = (): void => {
    if (!isPressedVisualActive) {
      return;
    }
    const elapsedMs = performance.now() - pressStartedAt;
    const remainingMs = Math.max(0, QUICK_TAP_PRESS_MIN_VISIBLE_MS - elapsedMs);
    if (remainingMs <= 0) {
      setPressedVisualActive(false);
      return;
    }
    clearReleaseTimer();
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      setPressedVisualActive(false);
    }, remainingMs);
  };

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    beginPressVisual();
    const onPointerUp = (): void => {
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      endPressVisual();
    };
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
  });

  element.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      beginPressVisual();
    }
  });

  element.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") {
      endPressVisual();
    }
  });

  element.addEventListener("blur", () => {
    endPressVisual();
  });
};

const programmaticPressReleaseTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

const beginProgrammaticPressVisual = (button: HTMLButtonElement): void => {
  const existingTimer = programmaticPressReleaseTimers.get(button);
  if (existingTimer) {
    clearTimeout(existingTimer);
    programmaticPressReleaseTimers.delete(button);
  }
  button.classList.remove("key--quick-press");
  // Force reflow so repeated programmatic presses retrigger the visual transition.
  void button.offsetWidth;
  button.classList.add("key--quick-press");
  const releaseTimer = setTimeout(() => {
    programmaticPressReleaseTimers.delete(button);
    button.classList.remove("key--quick-press");
  }, PROGRAMMATIC_PRESS_MIN_VISIBLE_MS);
  programmaticPressReleaseTimers.set(button, releaseTimer);
};

export const playProgrammaticKeyPressFeedback = (root: ParentNode, key: Key): void => {
  const candidates = Array.from(root.querySelectorAll<HTMLButtonElement>(".key[data-key]"));
  const matching = candidates.filter((button) => button.dataset.key === key && !button.disabled);
  if (matching.length === 0) {
    return;
  }
  const keypadButton = matching.find((button) => button.dataset.layoutSurface === "keypad");
  beginProgrammaticPressVisual(keypadButton ?? matching[0]);
};

const bindDropTargetCell = (element: HTMLElement, surface: LayoutSurface, index: number): void => {
  element.dataset.layoutSurface = surface;
  element.dataset.layoutIndex = index.toString();
};

const shouldSuppressClick = (): boolean => Date.now() < suppressClicksUntil || isInputAnimationLocked();
export const shouldSuppressClickForTests = (): boolean => shouldSuppressClick();
export const setSuppressClicksUntilForTests = (timestampMs: number): void => {
  suppressClicksUntil = timestampMs;
};
export const resetInputLockStateForTests = (): void => {
  suppressClicksUntil = 0;
  inputAnimationLockCount = 0;
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

  for (const [key, unlocked] of Object.entries(state.unlocks.valueExpression)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.slotOperators)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.utilities)) {
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

const getNewlyUnlockedKeys = (state: GameState): Set<Key> => {
  const currentSnapshot = buildUnlockSnapshot(state);
  if (!previousUnlockSnapshot) {
    previousUnlockSnapshot = currentSnapshot;
    return new Set<Key>();
  }

  const newlyUnlocked = new Set<Key>();
  for (const key of Object.keys(currentSnapshot) as Key[]) {
    if (!previousUnlockSnapshot[key] && currentSnapshot[key]) {
      newlyUnlocked.add(key);
    }
  }
  previousUnlockSnapshot = currentSnapshot;
  return newlyUnlocked;
};

export type RenderOptions = {
  skipGraph?: boolean;
  skipChecklist?: boolean;
  interactionMode?: "calculator" | "modify";
  inputBlocked?: boolean;
};

export const render = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: RenderOptions = {},
): void => {
  ensureKeyLabelResizeListener();
  const totalEl = root.querySelector("[data-v2-total-panel]") ?? root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");
  const storageSortControlsEl = root.querySelector("[data-storage-sort-controls]");
  const storageEl = root.querySelector("[data-storage-keys]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl || !storageEl) {
    throw new Error("UI mount points are missing.");
  }

  const interactionMode = options.interactionMode ?? "calculator";
  const inputBlocked = options.inputBlocked ?? false;
  const calculatorKeysLocked = inputBlocked || interactionMode === "modify";
  const storageLocked = inputBlocked || interactionMode === "calculator";
  if (root instanceof HTMLElement) {
    root.dataset.interactionMode = interactionMode;
    root.dataset.inputBlocked = inputBlocked ? "true" : "false";
  }
  if (storageEl instanceof HTMLElement) {
    storageEl.dataset.storageLocked = storageLocked ? "true" : "false";
  }

  const newlyUnlockedKeys = getNewlyUnlockedKeys(state);

  if (!options.skipGraph) {
    const isGraphVisible = state.ui.activeVisualizer === "graph";
    syncGraphVisibilityUi(root, isGraphVisible);
    if (isGraphVisible) {
      renderGraphDisplay(root, state.calculator.roll, state.calculator.rollErrors, state.unlocks.maxTotalDigits);
    } else {
      destroyGraphChart();
    }
  }

  renderTotalDisplay(totalEl, state);
  slotEl.textContent = buildOperationSlotDisplay(state);

  const rollView = buildRollViewModel(state.calculator.roll, state.calculator.euclidRemainders, state.calculator.rollErrors);
  const rollVisible = isFeedRollVisible(state, rollView.isVisible);
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
      remainder.textContent = `⟡= ${row.remainder}`;
      line.appendChild(remainder);
    }

    rollEl.appendChild(line);
  }

  if (!options.skipChecklist) {
    renderUnlockChecklist(unlockEl, state);
  }

  const hadPreviousKeypadDimensions = previousKeypadColumns !== null && previousKeypadRows !== null;
  const keypadDimensionsChanged =
    hadPreviousKeypadDimensions &&
    (previousKeypadColumns !== state.ui.keypadColumns || previousKeypadRows !== state.ui.keypadRows);
  const keypadBeforeRects = keypadDimensionsChanged ? collectKeypadCellRects(keysEl) : new Map<string, DOMRect>();
  const calcBodyEl = keysEl.closest<HTMLElement>(".calc");

  keysEl.innerHTML = "";
  if (keysEl instanceof HTMLElement) {
    keysEl.style.gridTemplateColumns = `repeat(${state.ui.keypadColumns}, minmax(0, 1fr))`;
    keysEl.style.gridTemplateRows = `repeat(${state.ui.keypadRows}, minmax(48px, 1fr))`;
    if (!keypadDimensionsChanged || shouldReduceMotion()) {
      delete keysEl.dataset.keypadGrow;
      if (calcBodyEl) {
        delete calcBodyEl.dataset.keypadGrow;
      }
    } else {
      const grewRows = previousKeypadRows !== null && state.ui.keypadRows > previousKeypadRows;
      const grewColumns = previousKeypadColumns !== null && state.ui.keypadColumns > previousKeypadColumns;
      const growDirection = grewRows && grewColumns ? "both" : grewRows ? "row" : grewColumns ? "column" : "";
      if (growDirection) {
        keysEl.dataset.keypadGrow = growDirection;
        bindPrefixedAnimationLock(keysEl, "keypad-grow-", KEYPAD_GROW_MAX_DURATION_MS);
        if (calcBodyEl) {
          calcBodyEl.dataset.keypadGrow = growDirection;
          bindPrefixedAnimationLock(calcBodyEl, "calc-grow-", CALC_GROW_MAX_DURATION_MS);
        }
      } else {
        delete keysEl.dataset.keypadGrow;
        if (calcBodyEl) {
          delete calcBodyEl.dataset.keypadGrow;
        }
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
    if (newlyUnlockedKeys.has(cell.key)) {
      button.classList.add("key--unlock-animate");
      bindExactAnimationLock(button, UNLOCK_ANIMATION_NAME, UNLOCK_ANIMATION_DURATION_MS);
    }
    setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
    const keypadToggleActive = isToggleFlagActive(state, cell);
    button.classList.toggle("key--toggle-active", keypadToggleActive);
    const keypadToggleAnimation = readToggleAnimation(cell);
    if (keypadToggleAnimation === "on") {
      button.classList.add("key--toggle-animate-on");
    } else if (keypadToggleAnimation === "off") {
      button.classList.add("key--toggle-animate-off");
    }
    button.setAttribute("aria-pressed", keypadToggleActive ? "true" : "false");
    button.disabled = calculatorKeysLocked;
    button.dataset.keypadCellId = slotId;
    button.dataset.key = cell.key;
    bindQuickTapPressFeedback(button);
    bindDraggableCell(button, state, dispatch, { surface: "keypad", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      if (shouldSuppressClick()) {
        return;
      }
      queueToggleAnimation(state, cell);
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

  if (keypadDimensionsChanged) {
    playKeypadFlip(keysEl, keypadBeforeRects);
  }
  previousKeypadColumns = state.ui.keypadColumns;
  previousKeypadRows = state.ui.keypadRows;

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
      button.disabled = inputBlocked;
      button.addEventListener("click", () => {
        if (inputBlocked || isActive) {
          return;
        }
        for (const action of buildStorageSortToggleSequence(state, segment.group)) {
          dispatch(action);
        }
      });
      storageSortControlsEl.appendChild(button);
    }
  }
  if (storageEl instanceof HTMLElement) {
    storageEl.dataset.storageSlotCount = state.ui.storageLayout.length.toString();
    ensureStorageGridObserver(storageEl);
  }
  const storageColumns = storageEl instanceof HTMLElement ? syncStorageGridMetrics(storageEl) : STORAGE_COLUMNS;
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

    const button = document.createElement("button");
    button.type = "button";
    button.className = "key key--storage key--storage-unlocked key--draggable";
    button.classList.add(`key--group-${getKeyVisualGroup(cell.key)}`);
    if (newlyUnlockedKeys.has(cell.key)) {
      button.classList.add("key--unlock-animate");
      bindExactAnimationLock(button, UNLOCK_ANIMATION_NAME, UNLOCK_ANIMATION_DURATION_MS);
    }
    setKeyButtonLabel(button, formatKeyCellLabel(state, cell));
    const storageToggleActive = isToggleFlagActive(state, cell);
    button.classList.toggle("key--toggle-active", storageToggleActive);
    const storageToggleAnimation = readToggleAnimation(cell);
    if (storageToggleAnimation === "on") {
      button.classList.add("key--toggle-animate-on");
    } else if (storageToggleAnimation === "off") {
      button.classList.add("key--toggle-animate-off");
    }
    button.setAttribute("aria-pressed", storageToggleActive ? "true" : "false");
    button.disabled = storageLocked;
    button.dataset.key = cell.key;
    bindDraggableCell(button, state, dispatch, { surface: "storage", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);
    storageEl.appendChild(button);
  }
  fitKeyLabelsInContainer(storageEl);

  pendingToggleAnimationByFlag = {};

  if (dragSession?.active) {
    const sourceNode = findDragTargetElement(dragSession.source);
    if (!sourceNode) {
      clearDragSession();
    } else {
      dragSession.originElement = sourceNode;
      sourceNode.classList.add("drag-source");
    }
  }
};







