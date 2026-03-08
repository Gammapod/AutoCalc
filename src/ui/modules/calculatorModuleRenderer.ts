import { unlockCatalog } from "../../content/unlocks.catalog.js";
import { calculatorValueToDisplayString, isRationalCalculatorValue, toRationalCalculatorValue } from "../../domain/calculatorValue.js";
import { keyToVisualizerId } from "../../domain/buttonRegistry.js";
import { isKeyUnlocked } from "../../domain/keyUnlocks.js";
import { getRollYDomain } from "../../domain/rollDerived.js";
import { STORAGE_COLUMNS } from "../../domain/state.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../../domain/keypadLayoutModel.js";
import { getLambdaDerivedValues, getLambdaUnusedPoints } from "../../domain/lambdaControl.js";
import {
  buildStepBodyHighlightRegions,
  resolveStepBodyHighlightRects,
} from "../stepHighlight.js";
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
} from "../shared/readModel.js";
import type {
  Action,
  CalculatorValue,
  CalculatorState,
  GameState,
  KeyButtonBehavior,
  KeyCell,
  Key,
  RollEntry,
  SlotOperator,
  VisualizerId,
} from "../../domain/types.js";
import { toDisplayString } from "../../infra/math/rationalEngine.js";
import { toPreferredFractionString } from "../../infra/math/euclideanEngine.js";
import { resolveLayoutMotionIntent } from "../layout/motionCoordinator.js";
import { beginMotionCycle, completeMotionCycle } from "../layout/motionLifecycleBridge.js";
import {
  applyDesktopLayoutSnapshot,
  clearDesktopSizingVars,
  isDesktopShellContext,
  resolveSingleInstanceSnapshot,
} from "../layout/layoutAdapter.js";
import type {
  CalculatorLayoutSnapshot,
  InteractionLayoutMode,
} from "../layout/types.js";
import { getOrCreateRuntime } from "../runtime/registry.js";
import {
  beginInputAnimationLock as beginInputAnimationLockInput,
  bindQuickTapPressFeedback as bindQuickTapPressFeedbackInput,
  isInputAnimationLocked as isInputAnimationLockedInput,
  playProgrammaticKeyPressFeedback as playProgrammaticKeyPressFeedbackInput,
  resetInputLockStateForTests as resetInputLockStateForTestsInput,
  setSuppressClicksUntilForTests as setSuppressClicksUntilForTestsInput,
  shouldSuppressClick as shouldSuppressClickInput,
  shouldSuppressClickForTests as shouldSuppressClickForTestsInput,
} from "./input/pressFeedback.js";
import {
  bindDraggableCell as bindDraggableCellInput,
  bindDropTargetCell as bindDropTargetCellInput,
  buildLayoutDropDispatchAction as buildLayoutDropDispatchActionInput,
  classifyDropAction as classifyDropActionInput,
  shouldStartDragFromDelta as shouldStartDragFromDeltaInput,
} from "./input/dragDrop.js";
import {
  clearToggleAnimations,
  getCalculatorModuleState,
  queueToggleAnimation as queueToggleAnimationById,
  readToggleAnimation as readToggleAnimationById,
} from "./calculator/runtime.js";

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

const GRAPH_WINDOW_SIZE = 25;
const DRAG_START_THRESHOLD_PX = 6;
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
const DESKTOP_LAYOUT_RUNTIME = new WeakMap<Element, {
  previousSnapshot: CalculatorLayoutSnapshot | null;
  previousInteractionMode: InteractionLayoutMode | null;
}>();

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

type CalculatorRendererRuntimeState = {
  graphChart: ChartHandle | null;
  graphCanvas: HTMLCanvasElement | null;
};

const createRuntimeState = (): CalculatorRendererRuntimeState => ({
  graphChart: null,
  graphCanvas: null,
});

const getRuntimeState = (root: Element): CalculatorRendererRuntimeState => {
  const runtime = getOrCreateRuntime(root).calculator;
  const existing = runtime.state.calculatorModuleRendererState as CalculatorRendererRuntimeState | undefined;
  if (existing) {
    return existing;
  }
  const created = createRuntimeState();
  runtime.state.calculatorModuleRendererState = created;
  runtime.dispose = () => {
    created.graphChart?.destroy();
    created.graphChart = null;
    runtime.state.calculatorModuleRendererState = createRuntimeState();
  };
  runtime.resetForTests = () => {
    created.graphChart?.destroy();
    created.graphChart = null;
    created.graphCanvas = null;
  };
  return created;
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
  memory: "storage.sort.memory",
  step: "storage.sort.step",
  visualizers: "storage.sort.visualizers",
};

const STORAGE_SORT_SEGMENTS: Array<{ label: string; group: KeyVisualGroup; ariaLabel: string }> = [
  { label: "=", group: "execution", ariaLabel: "Execution keys" },
  { label: "\u{1D45B}", group: "value_expression", ariaLabel: "Value expression keys" },
  { label: "\u2A02", group: "slot_operator", ariaLabel: "Operator keys" },
  { label: "\u23CF", group: "utility", ariaLabel: "Utility keys" },
  { label: "M", group: "memory", ariaLabel: "Memory keys" },
  { label: "\u25B6", group: "step", ariaLabel: "Step keys" },
  { label: "\u2191__", group: "visualizers", ariaLabel: "Visualizer keys" },
];

const getStorageSortFlag = (group: KeyVisualGroup): string => STORAGE_SORT_FLAG_BY_GROUP[group];

const getActiveStorageSortGroup = (state: GameState): KeyVisualGroup | null => {
  for (const segment of STORAGE_SORT_SEGMENTS) {
    if (Boolean(state.ui.buttonFlags[getStorageSortFlag(segment.group)])) {
      return segment.group;
    }
  }
  return null;
};

const buildStorageSortToggleSequence = (
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
  return keyToVisualizerId(key);
};

const getKeyButtonBehavior = (cell: KeyCell): KeyButtonBehavior => {
  return cell.behavior ?? PRESS_KEY_BEHAVIOR;
};

const isToggleFlagActive = (state: GameState, cell: KeyCell): boolean => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return state.ui.activeVisualizer === visualizer;
  }
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" ? getButtonFlag(state, behavior.flag) : false;
};

const formatKeyCellLabel = (state: GameState, cell: KeyCell): string => {
  if (cell.key === "\u23EF") {
    return isToggleFlagActive(state, cell) ? "\u275A\u275A" : "\u25BA";
  }
  return formatKeyLabel(cell.key);
};

const buildKeyButtonAction = (state: GameState, cell: KeyCell): Action => {
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

const getToggleAnimationIdForCell = (cell: KeyCell): string | null => {
  const visualizer = visualizerForKey(cell.key);
  if (visualizer) {
    return visualizer;
  }
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return null;
  }
  return behavior.flag;
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
  calculator.rollEntries.length === 0 &&
  calculator.operationSlots.length === 0 &&
  calculator.draftingSlot === null;

export const buildRollLines = (rollEntries: RollEntry[]): string[] => {
  return buildRollLinesShared(rollEntries);
};

export const buildRollRows = (
  rollEntries: RollEntry[],
): RollRow[] => {
  return buildRollRowsShared(rollEntries);
};

export const buildRollViewModel = (
  rollEntries: RollEntry[],
): RollViewModel => {
  return buildRollViewModelShared(rollEntries);
};

export const getRollLineClassName = (row: RollRow): string =>
  row.remainder || row.errorCode ? "roll-line roll-line--with-remainder" : "roll-line";

export const buildGraphPoints = (rollEntries: RollEntry[]): GraphPoint[] => {
  const points: GraphPoint[] = [];
  let previousVisibleErrorCode: string | undefined;
  for (let index = 0; index < rollEntries.length; index += 1) {
    const entry = rollEntries[index];
    const errorCode = entry.error?.code;
    if (errorCode && errorCode === previousVisibleErrorCode) {
      continue;
    }
    const value = entry.y;
    if (!isRationalCalculatorValue(value)) {
      previousVisibleErrorCode = errorCode;
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: Boolean(errorCode),
    });
    previousVisibleErrorCode = errorCode;
  }
  return points;
};

export const isGraphVisible = (rollEntries: RollEntry[]): boolean => rollEntries.length > 0;

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
    domainIndicator.textContent = totalIsNaN ? "∅" : getRollYDomain(domainValue);
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

const destroyGraphChart = (root: Element): void => {
  const runtime = getRuntimeState(root);
  runtime.graphChart?.destroy();
  runtime.graphChart = null;
  runtime.graphCanvas = null;
};

export const clearGraphModule = (root: Element): void => {
  destroyGraphChart(root);
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
  rollEntries: RollEntry[],
  unlockedTotalDigits: number,
): void => {
  const runtime = getRuntimeState(root);
  const canvas = root.querySelector<HTMLCanvasElement>("[data-grapher-canvas]");
  if (!canvas) {
    destroyGraphChart(root);
    return;
  }

  if (runtime.graphCanvas !== canvas) {
    destroyGraphChart(root);
    runtime.graphCanvas = canvas;
  }

  const chartCtor = window.Chart;
  if (!chartCtor) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const points = buildGraphPoints(rollEntries);
  const hasPoints = isGraphVisible(rollEntries);
  const options = buildGraphOptions(hasPoints, points, unlockedTotalDigits);
  const pointBackgroundColor = points.map((point) => (point.hasError ? "#ff6f6f" : "#bcffd6"));
  const pointBorderColor = points.map((point) => (point.hasError ? "rgba(255, 111, 111, 0.9)" : "rgba(188, 255, 214, 0.9)"));

  if (!runtime.graphChart) {
    runtime.graphChart = new chartCtor(context, {
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

  runtime.graphChart.data.datasets[0].data = points;
  runtime.graphChart.data.datasets[0].pointRadius = hasPoints ? 3 : 0;
  runtime.graphChart.data.datasets[0].pointBackgroundColor = pointBackgroundColor;
  runtime.graphChart.data.datasets[0].pointBorderColor = pointBorderColor;
  runtime.graphChart.options = options;
  runtime.graphChart.update("none");
};

export const renderGraphModule = (root: Element, state: GameState): void => {
  const graphVisible = state.ui.activeVisualizer === "graph";
  syncGraphVisibilityUi(root, graphVisible);
  if (graphVisible) {
    renderGraphDisplay(root, state.calculator.rollEntries, state.unlocks.maxTotalDigits);
  } else {
    destroyGraphChart(root);
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

const getStorageRowCount = (buttonCount: number, columns: number = STORAGE_COLUMNS): number => {
  if (columns <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(buttonCount / columns));
};

const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const getDesktopLayoutRuntime = (root: Element): {
  previousSnapshot: CalculatorLayoutSnapshot | null;
  previousInteractionMode: InteractionLayoutMode | null;
} => {
  const existing = DESKTOP_LAYOUT_RUNTIME.get(root);
  if (existing) {
    return existing;
  }
  const created = {
    previousSnapshot: null,
    previousInteractionMode: null,
  };
  DESKTOP_LAYOUT_RUNTIME.set(root, created);
  return created;
};

const isInputAnimationLocked = (root?: Element): boolean => isInputAnimationLockedInput(root);

const beginInputAnimationLock = (fallbackMs: number, root?: Element): (() => void) =>
  beginInputAnimationLockInput(fallbackMs, root);

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
  const controller = new AbortController();
  const finish = (): void => {
    if (completed) {
      return;
    }
    completed = true;
    controller.abort();
    onComplete();
  };

  element.addEventListener(
    "animationend",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!animationEvent.animationName.startsWith(animationPrefix)) {
        return;
      }
      finish();
    },
    { signal: controller.signal },
  );
  element.addEventListener(
    "animationcancel",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!animationEvent.animationName.startsWith(animationPrefix)) {
        return;
      }
      finish();
    },
    { signal: controller.signal },
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

const buildStorageRenderOrder = (state: GameState): number[] => {
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

const shouldStartDragFromDelta = (
  deltaX: number,
  deltaY: number,
  thresholdPx: number = DRAG_START_THRESHOLD_PX,
): boolean => shouldStartDragFromDeltaInput(deltaX, deltaY, thresholdPx);

const classifyDropAction = (
  state: GameState,
  source: { surface: "keypad" | "storage"; index: number },
  destination: { surface: "keypad" | "storage"; index: number },
): "move" | "swap" | null => classifyDropActionInput(state, source, destination);

const buildLayoutDropDispatchAction = (
  source: { surface: "keypad" | "storage"; index: number },
  target: { surface: "keypad" | "storage"; index: number },
  action: "move" | "swap",
): Action => buildLayoutDropDispatchActionInput(source, target, action);

const playProgrammaticKeyPressFeedback = (root: ParentNode, key: Key): void =>
  playProgrammaticKeyPressFeedbackInput(root, key);

const shouldSuppressClickForTests = (): boolean => shouldSuppressClickForTestsInput();

const setSuppressClicksUntilForTests = (timestampMs: number): void =>
  setSuppressClicksUntilForTestsInput(timestampMs);

const resetInputLockStateForTests = (): void => resetInputLockStateForTestsInput();

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

export type RenderOptions = {
  interactionMode?: "calculator" | "modify";
  inputBlocked?: boolean;
};

const resolveCalculatorKeysLocked = (
  interactionMode: "calculator" | "modify",
  inputBlocked: boolean,
  uiShell: string | null,
): boolean => {
  const isDesktopShell = uiShell === "desktop";
  return inputBlocked || (interactionMode === "modify" && !isDesktopShell);
};

export const render = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: RenderOptions = {},
): void => {
  ensureKeyLabelResizeListener(root);
  const totalEl = root.querySelector("[data-v2-total-panel]") ?? root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl) {
    throw new Error("Calculator UI mount points are missing.");
  }

  const interactionMode = options.interactionMode ?? "calculator";
  const inputBlocked = options.inputBlocked ?? false;
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

  {
    const resolvedTotalEl = totalEl as Element;
    const resolvedSlotEl = slotEl as Element;
    const resolvedRollEl = rollEl as Element;
    const resolvedUnlockEl = unlockEl as Element;
    const resolvedKeysEl = keysEl as Element;

    renderTotalDisplay(resolvedTotalEl, state);
    resolvedSlotEl.textContent = buildOperationSlotDisplay(state);

    const rollView = buildRollViewModel(state.calculator.rollEntries);
    const rollVisible = isFeedRollVisible(state, rollView.isVisible);
    resolvedRollEl.innerHTML = "";
    resolvedRollEl.setAttribute("data-roll-visible", rollVisible ? "true" : "false");
    resolvedRollEl.setAttribute("aria-hidden", rollVisible ? "false" : "true");
    resolvedRollEl.setAttribute("aria-label", rollVisible ? "Calculator roll" : "Calculator roll hidden");
    if (resolvedRollEl instanceof HTMLElement) {
      resolvedRollEl.style.setProperty("--roll-line-count", rollView.lineCount.toString());
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

      resolvedRollEl.appendChild(line);
    }

    renderUnlockChecklist(resolvedUnlockEl, state);

    const desktopShell = isDesktopShellContext(root);
    const runtime = getDesktopLayoutRuntime(root);
    const calcBodyEl = resolvedKeysEl.closest<HTMLElement>(".calc");
    const currentSnapshot =
      resolvedKeysEl instanceof HTMLElement
      ? resolveSingleInstanceSnapshot({
          root,
          keysEl: resolvedKeysEl,
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
    const keypadBeforeRects = keypadDimensionsChanged ? collectKeypadCellRects(resolvedKeysEl) : new Map<string, DOMRect>();

    resolvedKeysEl.innerHTML = "";
    if (resolvedKeysEl instanceof HTMLElement) {
    if (desktopShell && currentSnapshot) {
        applyDesktopLayoutSnapshot(resolvedKeysEl, calcBodyEl, currentSnapshot);
    } else {
        resolvedKeysEl.style.gridTemplateColumns = `repeat(${state.ui.keypadColumns}, minmax(0, 1fr))`;
        resolvedKeysEl.style.gridTemplateRows = `repeat(${state.ui.keypadRows}, minmax(48px, 1fr))`;
        resolvedKeysEl.style.removeProperty("height");
        clearDesktopSizingVars(resolvedKeysEl, calcBodyEl);
    }
    if (!keypadDimensionsChanged) {
      delete resolvedKeysEl.dataset.keypadGrow;
      if (calcBodyEl) {
        delete calcBodyEl.dataset.keypadGrow;
      }
      completeLayoutMotion();
    } else {
      const growDirection = motionIntent.keypadGrowDirection;
      if (growDirection) {
        if (!desktopShell) {
          resolvedKeysEl.dataset.keypadGrow = growDirection;
          bindPrefixedAnimationLock(resolvedKeysEl, "keypad-grow-", KEYPAD_GROW_MAX_DURATION_MS);
        } else {
          delete resolvedKeysEl.dataset.keypadGrow;
        }
        if (calcBodyEl) {
          calcBodyEl.dataset.keypadGrow = growDirection;
          bindPrefixedAnimationLock(calcBodyEl, "calc-grow-", CALC_GROW_MAX_DURATION_MS);
          bindPrefixedAnimationCompletion(calcBodyEl, "calc-grow-", completeLayoutMotion);
        } else if (!desktopShell) {
          bindPrefixedAnimationCompletion(resolvedKeysEl, "keypad-grow-", completeLayoutMotion);
        }
      } else {
        delete resolvedKeysEl.dataset.keypadGrow;
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
      bindDropTargetCellInput(placeholder, "keypad", index);
      placeholder.dataset.layoutOccupied = "empty";
      placeholder.dataset.keypadCellId = slotId;
      appendDebugSlotLabel(placeholder, slotLabel);
      resolvedKeysEl.appendChild(placeholder);
      continue;
    }
    if (!isKeyUnlocked(state, cell.key)) {
      const hidden = document.createElement("div");
      hidden.className = "placeholder placeholder--drop-slot placeholder--locked-hidden";
      hidden.setAttribute("aria-hidden", "true");
      hidden.dataset.keypadCellId = slotId;
      appendDebugSlotLabel(hidden, slotLabel);
      resolvedKeysEl.appendChild(hidden);
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
    bindQuickTapPressFeedbackInput(root, button);
    bindDraggableCellInput(root, button, state, dispatch, { surface: "keypad", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      if (interactionMode !== "calculator") {
        return;
      }
      if (shouldSuppressClickInput(root)) {
        return;
      }
      queueToggleAnimation(root, state, cell);
      dispatch(buildKeyButtonAction(state, cell));
    });
    resolvedKeysEl.appendChild(button);
  }
  const stepHighlightRects = resolveStepBodyHighlightRects(resolvedKeysEl, stepBodyHighlights);
  for (const rect of stepHighlightRects) {
    const highlight = document.createElement("div");
    highlight.className = STEP_BODY_HIGHLIGHT_CLASS;
    highlight.setAttribute("aria-hidden", "true");
    highlight.style.left = `${rect.left.toFixed(2)}px`;
    highlight.style.top = `${rect.top.toFixed(2)}px`;
    highlight.style.width = `${rect.width.toFixed(2)}px`;
    highlight.style.height = `${rect.height.toFixed(2)}px`;
    resolvedKeysEl.appendChild(highlight);
  }
  fitKeyLabelsInContainer(resolvedKeysEl);

  if (keypadDimensionsChanged && !desktopShell) {
    playKeypadFlip(resolvedKeysEl, keypadBeforeRects);
  }
  runtime.previousSnapshot = currentSnapshot;
  runtime.previousInteractionMode = interactionMode;
  }

  clearToggleAnimations(root);
};








