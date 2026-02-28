import { unlockCatalog } from "../content/unlocks.catalog.js";
import { CHECKLIST_UNLOCK_ID, GRAPH_VISIBLE_FLAG, STORAGE_COLUMNS } from "../domain/state.js";
import { getSlotIdAtIndex, toCoordFromIndex } from "../domain/keypadLayoutModel.js";
import { isStorageLayoutValid } from "../domain/reducer.layout.js";
import { buildUnlockCriteria } from "../domain/unlockEngine.js";
import type {
  Action,
  CalculatorState,
  EuclidRemainderEntry,
  GameState,
  KeyButtonBehavior,
  KeyCell,
  Key,
  LayoutSurface,
  SlotOperator,
  UnlockDefinition,
  UnlockEffect,
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
};

type GraphDataset = {
  data: GraphPoint[];
  showLine: boolean;
  pointRadius: number;
  pointHoverRadius: number;
  pointBackgroundColor: string;
  pointBorderColor: string;
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
    color?: string;
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

let previousChecklistUnlocked: boolean | null = null;
let previousUnlockSnapshot: Record<Key, boolean> | null = null;
let pendingToggleAnimationByFlag: Record<string, "on" | "off"> = {};
let previousKeypadColumns: number | null = null;
let previousKeypadRows: number | null = null;
let graphChart: ChartHandle | null = null;
let graphCanvas: HTMLCanvasElement | null = null;
let dragSession: DragSession | null = null;
let suppressClicksUntil = 0;
const GRAPH_WINDOW_SIZE = 25;
const GRAPH_MIN_Y_RANGE = 15;
const DRAG_START_THRESHOLD_PX = 6;
const DRAG_CLICK_SUPPRESS_MS = 220;
const KEYPAD_FLIP_DURATION_MS = 760;

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
};

export type KeyVisualGroup = "value_expression" | "slot_operator" | "utility" | "execution";

type Occupancy = "key" | "empty" | "invalid";
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
  operator === "*" ? "\u00D7" : operator === "/" ? "\u00F7" : operator;

const formatOperatorForOperationSlotDisplay = (operator: SlotOperator): string =>
  operator === "\u27E1" ? "\u2662" : formatOperatorForDisplay(operator);

export const formatKeyLabel = (key: Key): string => {
  if (key === "NEG") {
    return "-\u{1D465}";
  }
  if (key === "UNDO") {
    return "\u21BA";
  }
  if (key === "\u23EF") {
    return "\u23F5\uFE0E";
  }
  if (key === "#") {
    return "#/\u27E1";
  }
  if (key === "\u27E1") {
    return "\u27E1";
  }
  if (key === "*" || key === "/") {
    return formatOperatorForDisplay(key);
  }
  return key;
};

const PRESS_KEY_BEHAVIOR: KeyButtonBehavior = { type: "press_key" };
const GRAPH_TOGGLE_BEHAVIOR: KeyButtonBehavior = { type: "toggle_flag", flag: GRAPH_VISIBLE_FLAG };

const getButtonFlag = (state: GameState, flag: string): boolean => {
  if (flag === GRAPH_VISIBLE_FLAG) {
    return state.ui.buttonFlags[GRAPH_VISIBLE_FLAG] ?? false;
  }
  return Boolean(state.ui.buttonFlags[flag]);
};

export const getKeyButtonBehavior = (cell: KeyCell): KeyButtonBehavior => {
  if (cell.key === "GRAPH") {
    return cell.behavior ?? GRAPH_TOGGLE_BEHAVIOR;
  }
  return cell.behavior ?? PRESS_KEY_BEHAVIOR;
};

export const isToggleFlagActive = (state: GameState, cell: KeyCell): boolean => {
  const behavior = getKeyButtonBehavior(cell);
  return behavior.type === "toggle_flag" ? getButtonFlag(state, behavior.flag) : false;
};

export const formatKeyCellLabel = (state: GameState, cell: KeyCell): string => {
  if (cell.key === "\u23EF") {
    return isToggleFlagActive(state, cell) ? "\u23F8\uFE0E" : "\u23F5\uFE0E";
  }
  return formatKeyLabel(cell.key);
};

export const buildKeyButtonAction = (state: GameState, cell: KeyCell): Action => {
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type === "toggle_flag") {
    return { type: "TOGGLE_FLAG", flag: behavior.flag };
  }
  return { type: "PRESS_KEY", key: cell.key };
};

const queueToggleAnimation = (state: GameState, cell: KeyCell): void => {
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return;
  }
  pendingToggleAnimationByFlag[behavior.flag] = isToggleFlagActive(state, cell) ? "off" : "on";
};

const readToggleAnimation = (cell: KeyCell): "on" | "off" | null => {
  const behavior = getKeyButtonBehavior(cell);
  if (behavior.type !== "toggle_flag") {
    return null;
  }
  return pendingToggleAnimationByFlag[behavior.flag] ?? null;
};

const clampUnlockedDigits = (value: number): number =>
  Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, value));

export const buildTotalSlotModel = (total: { num: bigint; den: bigint }, unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const magnitude = total.num < 0n ? -total.num : total.num;
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
  calculator.total.num === 0n &&
  calculator.total.den === 1n &&
  !calculator.pendingNegativeTotal &&
  calculator.roll.length === 0 &&
  calculator.euclidRemainders.length === 0 &&
  calculator.operationSlots.length === 0 &&
  calculator.draftingSlot === null;

export const buildRollLines = (roll: Array<{ num: bigint; den: bigint }>): string[] => {
  return roll.map((value) => toPreferredFractionString(value));
};

export const buildRollRows = (rollLines: string[], euclidRemainders: EuclidRemainderEntry[] = []): RollRow[] => {
  const remainderByRollIndex = new Map<number, string>();
  for (const remainder of euclidRemainders) {
    remainderByRollIndex.set(remainder.rollIndex, toPreferredFractionString(remainder.value));
  }

  return rollLines.map((value, index) => ({
    prefix: index === 0 ? "X =" : "  =",
    value,
    remainder: remainderByRollIndex.get(index),
  }));
};

export const buildRollViewModel = (
  roll: Array<{ num: bigint; den: bigint }>,
  euclidRemainders: EuclidRemainderEntry[] = [],
): RollViewModel => {
  const lines = buildRollLines(roll);
  const rows = buildRollRows(lines, euclidRemainders);
  const valueColumnChars = rows.reduce(
    (max, row) => Math.max(max, row.value.length, row.remainder ? `⟡= ${row.remainder}`.length : 0),
    0,
  );
  return {
    rows,
    isVisible: rows.length > 0,
    lineCount: rows.length,
    valueColumnChars,
  };
};

export const getRollLineClassName = (row: RollRow): string =>
  row.remainder ? "roll-line roll-line--with-remainder" : "roll-line";

export const buildGraphPoints = (roll: Array<{ num: bigint; den: bigint }>): GraphPoint[] => {
  return roll.map((value, index) => ({
    x: index,
    y: Number(value.num) / Number(value.den),
  }));
};

export const isGraphVisible = (roll: Array<{ num: bigint; den: bigint }>): boolean => roll.length > 0;

export const buildOperationSlotDisplay = (state: GameState): string => {
  const visibleSlots = state.unlocks.maxSlots;
  if (visibleSlots <= 0) {
    return "(no operation slots)";
  }

  const filledTokens = state.calculator.operationSlots.map(
    (slot) => `[ ${formatOperatorForOperationSlotDisplay(slot.operator)} ${slot.operand.toString()} ]`,
  );
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput
      ? `${state.calculator.draftingSlot.isNegative ? "-" : ""}${state.calculator.draftingSlot.operandInput}`
      : state.calculator.draftingSlot.isNegative
        ? "-_"
        : "_";
    filledTokens.push(`[ ${formatOperatorForOperationSlotDisplay(state.calculator.draftingSlot.operator)} ${operand} ]`);
  }

  const tokens = filledTokens.slice(0, visibleSlots);
  while (tokens.length < visibleSlots) {
    tokens.push("[ _ _ ]");
  }

  return tokens.join(" -> ");
};

const getUnlockName = (effect: UnlockEffect): string => {
  if (effect.type === "unlock_digit") {
    return effect.key;
  }
  if (effect.type === "unlock_slot_operator") {
    return formatOperatorForDisplay(effect.key);
  }
  if (effect.type === "unlock_execution") {
    return effect.key;
  }
  if (effect.type === "unlock_utility") {
    return effect.key;
  }
  if (effect.type === "increase_max_total_digits") {
    return "maxTotalDigits";
  }
  if (effect.type === "unlock_storage_drawer") {
    return "storage";
  }
  if (effect.type === "upgrade_keypad_column") {
    return "keypadCols";
  }
  if (effect.type === "upgrade_keypad_row") {
    return "keypadRows";
  }
  if (effect.type === "move_key_to_coord") {
    return `${formatKeyLabel(effect.key)}->R${effect.row.toString()}C${effect.col.toString()}`;
  }
  return "unknown";
};

const isUnlockImpossible = (_unlock: UnlockDefinition, _state: GameState): boolean => false;

export const buildUnlockRows = (
  state: GameState,
  catalog: UnlockDefinition[],
  impossibleCheck: (unlock: UnlockDefinition, state: GameState) => boolean = isUnlockImpossible,
): UnlockRowVm[] => {
  const rows = catalog.map<UnlockRowVm>((unlock) => {
    const completed = state.completedUnlockIds.includes(unlock.id);
    const impossible = impossibleCheck(unlock, state);
    const rowState: UnlockRowState = impossible ? "impossible" : completed ? "completed" : "not_completed";
    const criteria = buildUnlockCriteria(unlock.predicate, state);
    return {
      id: unlock.id,
      name: getUnlockName(unlock.effect),
      state: rowState,
      criteria: completed ? criteria.map((criterion) => ({ ...criterion, checked: true })) : criteria,
    };
  });

  const visible = rows.filter((row) => row.state !== "impossible");
  const pending = visible.filter((row) => row.state === "not_completed");
  const completed = visible.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};

export const isChecklistUnlocked = (state: GameState): boolean =>
  state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID);

const renderUnlockChecklist = (unlockEl: Element, state: GameState): void => {
  const checklistUnlocked = isChecklistUnlocked(state);
  const shouldAnimateOpen = previousChecklistUnlocked === false && checklistUnlocked;
  previousChecklistUnlocked = checklistUnlocked;

  unlockEl.setAttribute("data-checklist-state", checklistUnlocked ? "open" : "locked");
  unlockEl.setAttribute("data-checklist-animate", shouldAnimateOpen ? "true" : "false");

  if (!checklistUnlocked) {
    unlockEl.innerHTML = "";
    unlockEl.setAttribute("aria-hidden", "true");
    return;
  }

  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = "Unlocks";
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const nameHeader = document.createElement("span");
  nameHeader.textContent = "Name |";
  const criteriaHeader = document.createElement("span");
  criteriaHeader.textContent = "Criteria";
  header.append(nameHeader, criteriaHeader);
  unlockEl.appendChild(header);

  const rows = buildUnlockRows(state, unlockCatalog);
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "unlock-row";
    if (row.state === "completed") {
      rowEl.classList.add("unlock-row--completed");
    }

    const nameEl = document.createElement("span");
    nameEl.className = "unlock-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);

    const criteriaEl = document.createElement("span");
    criteriaEl.className = "unlock-criteria";
    for (const criterion of row.criteria) {
      const criterionEl = document.createElement("span");
      criterionEl.className = "unlock-criterion";
      criterionEl.textContent = `[${criterion.checked ? "x" : " "}] ${criterion.label}`;
      criteriaEl.appendChild(criterionEl);
    }
    rowEl.appendChild(criteriaEl);

    unlockEl.appendChild(rowEl);
  }
};

const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const hasIntegerTotal = state.calculator.total.den === 1n;
  totalEl.innerHTML = "";
  if (isClearedCalculatorState(state.calculator)) {
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

  const isNegative =
    hasIntegerTotal &&
    (state.calculator.total.num < 0n || (state.calculator.total.num === 0n && state.calculator.pendingNegativeTotal));

  if (isNegative) {
    const sign = document.createElement("div");
    sign.className = "seg-sign";
    sign.textContent = "-";
    totalEl.appendChild(sign);
  }

  if (!hasIntegerTotal) {
    const fraction = document.createElement("div");
    fraction.className = "seg-fraction";
    fraction.textContent = toDisplayString(state.calculator.total);
    totalEl.appendChild(fraction);
    totalEl.setAttribute("aria-label", `Total ${toDisplayString(state.calculator.total)}`);
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

  totalEl.setAttribute("aria-label", `Total ${toDisplayString(state.calculator.total)}`);
  totalEl.appendChild(frame);
};

const getGraphBounds = (points: GraphPoint[]): { min: number; max: number } => {
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = Math.max(spread * 0.12, 0.1);
  let lower = min - padding;
  let upper = max + padding;

  const range = upper - lower;
  if (range < GRAPH_MIN_Y_RANGE) {
    const deficit = GRAPH_MIN_Y_RANGE - range;
    lower -= deficit / 2;
    upper += deficit / 2;
  }

  return { min: lower, max: upper };
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

const buildGraphOptions = (hasPoints: boolean, points: GraphPoint[]): GraphOptions => {
  const bounds = hasPoints ? getGraphBounds(points) : { min: 0, max: 1 };
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
        display: hasPoints,
        ticks: {
          color: "#bcffd6",
          autoSkip: true,
          callback: makeTickLabelCallback(bounds.max),
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
    },
  };
};

const destroyGraphChart = (): void => {
  graphChart?.destroy();
  graphChart = null;
  graphCanvas = null;
};

const renderGraphDisplay = (root: Element, roll: Array<{ num: bigint; den: bigint }>): void => {
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

  const points = buildGraphPoints(roll);
  const hasPoints = isGraphVisible(roll);
  const options = buildGraphOptions(hasPoints, points);

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
            pointBackgroundColor: "#bcffd6",
            pointBorderColor: "rgba(188, 255, 214, 0.9)",
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
  graphChart.options = options;
  graphChart.update("none");
};

const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  if (/^\d$/.test(key) || key === "NEG") {
    return state.unlocks.valueExpression[key as keyof GameState["unlocks"]["valueExpression"]];
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return state.unlocks.slotOperators[key];
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "GRAPH") {
    return state.unlocks.utilities[key];
  }
  if (key === "=" || key === "++" || key === "\u23EF") {
    return state.unlocks.execution[key];
  }
  return false;
};

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  if (/^\d$/.test(key) || key === "NEG") {
    return "value_expression";
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return "slot_operator";
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "GRAPH") {
    return "utility";
  }
  return "execution";
};

const isExecutionKey = (key: Key): boolean => key === "=" || key === "++" || key === "\u23EF";

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

const buildStorageSlotLabels = (layout: GameState["ui"]["storageLayout"]): string[] =>
  layout.map((_cell, index) => {
    const row = Math.floor(index / STORAGE_COLUMNS) + 1;
    const column = (index % STORAGE_COLUMNS) + 1;
    return `S${row}C${column} #${index}`;
  });

const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    }, KEYPAD_FLIP_DURATION_MS + 20);
  }
};

export const buildStorageRenderOrder = (state: GameState): number[] => {
  const unlocked: number[] = [];
  const empty: number[] = [];
  const locked: number[] = [];

  for (let index = 0; index < state.ui.storageLayout.length; index += 1) {
    const cell = state.ui.storageLayout[index];
    if (!cell) {
      empty.push(index);
      continue;
    }
    if (isKeyUnlocked(state, cell.key)) {
      unlocked.push(index);
      continue;
    }
    locked.push(index);
  }

  return [...unlocked, ...empty, ...locked];
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

const getCellOccupancy = (state: GameState, target: DragTarget): Occupancy => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return "invalid";
  }
  if (target.surface === "keypad") {
    const cell = state.ui.keyLayout[target.index];
    if (!cell) {
      return "invalid";
    }
    if (cell.kind !== "key") {
      return "empty";
    }
    return isKeyUnlocked(state, cell.key) ? "key" : "invalid";
  }
  const slot = state.ui.storageLayout[target.index];
  if (typeof slot === "undefined") {
    return "invalid";
  }
  if (!slot) {
    return "empty";
  }
  return isKeyUnlocked(state, slot.key) ? "key" : "invalid";
};

const getKeyAtTarget = (state: GameState, target: DragTarget): Key | null => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return null;
  }
  if (target.surface === "keypad") {
    const cell = state.ui.keyLayout[target.index];
    if (!cell || cell.kind !== "key") {
      return null;
    }
    return cell.key;
  }
  const slot = state.ui.storageLayout[target.index];
  return slot?.key ?? null;
};

const countKeypadExecutionKeys = (state: GameState): number =>
  state.ui.keyLayout.reduce(
    (count, cell) => (cell.kind === "key" && isExecutionKey(cell.key) ? count + 1 : count),
    0,
  );

const violatesExecutionCountRule = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  action: DropAction,
): boolean => {
  const sourceKey = getKeyAtTarget(state, source);
  if (!sourceKey) {
    return true;
  }

  let nextExecutionCount = countKeypadExecutionKeys(state);
  const sourceIsExecution = isExecutionKey(sourceKey);

  if (sourceIsExecution && source.surface === "keypad") {
    nextExecutionCount -= 1;
  }
  if (sourceIsExecution && destination.surface === "keypad") {
    nextExecutionCount += 1;
  }

  if (action === "swap") {
    const destinationKey = getKeyAtTarget(state, destination);
    if (!destinationKey) {
      return true;
    }
    const destinationIsExecution = isExecutionKey(destinationKey);
    if (destinationIsExecution && destination.surface === "keypad") {
      nextExecutionCount -= 1;
    }
    if (destinationIsExecution && source.surface === "keypad") {
      nextExecutionCount += 1;
    }
  }

  return nextExecutionCount >= 2;
};

const isStorageDropGeometryValid = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  action: DropAction,
): boolean => {
  if (source.surface !== "storage" && destination.surface !== "storage") {
    return true;
  }
  const nextStorage = [...state.ui.storageLayout];
  const sourceStorageCell = source.surface === "storage" ? nextStorage[source.index] : null;
  const destinationStorageCell = destination.surface === "storage" ? nextStorage[destination.index] : null;
  if (action === "move") {
    if (source.surface === "storage") {
      nextStorage[source.index] = null;
    }
    if (destination.surface === "storage") {
      if (source.surface === "storage") {
        nextStorage[destination.index] = sourceStorageCell;
      } else {
        const sourceKeypadCell = state.ui.keyLayout[source.index];
        nextStorage[destination.index] = sourceKeypadCell?.kind === "key" ? sourceKeypadCell : null;
      }
    }
  } else {
    if (source.surface === "storage" && destination.surface === "storage") {
      nextStorage[source.index] = destinationStorageCell;
      nextStorage[destination.index] = sourceStorageCell;
    } else if (source.surface === "storage" && destination.surface === "keypad") {
      const destinationKeypadCell = state.ui.keyLayout[destination.index];
      nextStorage[source.index] = destinationKeypadCell?.kind === "key" ? destinationKeypadCell : null;
    } else if (source.surface === "keypad" && destination.surface === "storage") {
      const sourceKeypadCell = state.ui.keyLayout[source.index];
      nextStorage[destination.index] = sourceKeypadCell?.kind === "key" ? sourceKeypadCell : null;
    }
  }
  return isStorageLayoutValid(nextStorage);
};

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
): DropAction | null => {
  if (source.surface === destination.surface && source.index === destination.index) {
    return null;
  }
  const sourceOccupancy = getCellOccupancy(state, source);
  const destinationOccupancy = getCellOccupancy(state, destination);
  if (sourceOccupancy !== "key" || destinationOccupancy === "invalid") {
    return null;
  }
  const action: DropAction = destinationOccupancy === "key" ? "swap" : "move";
  if (violatesExecutionCountRule(state, source, destination, action)) {
    return null;
  }
  return isStorageDropGeometryValid(state, source, destination, action) ? action : null;
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

const bindDropTargetCell = (element: HTMLElement, surface: LayoutSurface, index: number): void => {
  element.dataset.layoutSurface = surface;
  element.dataset.layoutIndex = index.toString();
};

const shouldSuppressClick = (): boolean => Date.now() < suppressClicksUntil;

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

export const render = (root: Element, state: GameState, dispatch: (action: Action) => unknown): void => {
  const totalEl = root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");
  const storageEl = root.querySelector("[data-storage-keys]");
  const grapherDeviceEl = root.querySelector<HTMLElement>("[data-grapher-device]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl || !storageEl) {
    throw new Error("UI mount points are missing.");
  }

  const newlyUnlockedKeys = getNewlyUnlockedKeys(state);

  const isGraphVisible = getButtonFlag(state, GRAPH_VISIBLE_FLAG);
  if (grapherDeviceEl) {
    grapherDeviceEl.hidden = !isGraphVisible;
  }
  if (isGraphVisible) {
    renderGraphDisplay(root, state.calculator.roll);
  } else {
    destroyGraphChart();
  }

  renderTotalDisplay(totalEl, state);
  slotEl.textContent = buildOperationSlotDisplay(state);

  const rollView = buildRollViewModel(state.calculator.roll, state.calculator.euclidRemainders);
  rollEl.innerHTML = "";
  rollEl.setAttribute("data-roll-visible", rollView.isVisible ? "true" : "false");
  rollEl.setAttribute("aria-hidden", rollView.isVisible ? "false" : "true");
  rollEl.setAttribute("aria-label", rollView.isVisible ? "Calculator roll" : "Calculator roll hidden");
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

    if (row.remainder) {
      const remainder = document.createElement("span");
      remainder.className = "roll-remainder";
      remainder.textContent = `⟡= ${row.remainder}`;
      line.appendChild(remainder);
    }

    rollEl.appendChild(line);
  }

  renderUnlockChecklist(unlockEl, state);

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
        if (calcBodyEl) {
          calcBodyEl.dataset.keypadGrow = growDirection;
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
    }
    button.textContent = formatKeyCellLabel(state, cell);
    const keypadToggleActive = isToggleFlagActive(state, cell);
    button.classList.toggle("key--toggle-active", keypadToggleActive);
    const keypadToggleAnimation = readToggleAnimation(cell);
    if (keypadToggleAnimation === "on") {
      button.classList.add("key--toggle-animate-on");
    } else if (keypadToggleAnimation === "off") {
      button.classList.add("key--toggle-animate-off");
    }
    button.setAttribute("aria-pressed", keypadToggleActive ? "true" : "false");
    button.disabled = false;
    button.dataset.keypadCellId = slotId;
    bindDraggableCell(button, state, dispatch, { surface: "keypad", index }, cell.key);
    appendDebugSlotLabel(button, slotLabel);
    button.addEventListener("click", () => {
      if (shouldSuppressClick()) {
        return;
      }
      queueToggleAnimation(state, cell);
      dispatch(buildKeyButtonAction(state, cell));
    });
    keysEl.appendChild(button);
  }

  if (keypadDimensionsChanged) {
    playKeypadFlip(keysEl, keypadBeforeRects);
  }
  previousKeypadColumns = state.ui.keypadColumns;
  previousKeypadRows = state.ui.keypadRows;

  storageEl.innerHTML = "";
  if (!state.unlocks.uiUnlocks.storageVisible) {
    storageEl.setAttribute("aria-hidden", "true");
    storageEl.setAttribute("data-storage-visible", "false");
  } else {
    storageEl.setAttribute("aria-hidden", "false");
    storageEl.setAttribute("data-storage-visible", "true");
    const storageLabels = buildStorageSlotLabels(state.ui.storageLayout);
    const storageRowCount = getStorageRowCount(state.ui.storageLayout.length);
    storageEl.setAttribute("data-storage-rows", storageRowCount.toString());
    if (storageEl instanceof HTMLElement) {
      storageEl.style.setProperty("--storage-rows", storageRowCount.toString());
    }
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
      }
      button.textContent = formatKeyCellLabel(state, cell);
      const storageToggleActive = isToggleFlagActive(state, cell);
      button.classList.toggle("key--toggle-active", storageToggleActive);
      const storageToggleAnimation = readToggleAnimation(cell);
      if (storageToggleAnimation === "on") {
        button.classList.add("key--toggle-animate-on");
      } else if (storageToggleAnimation === "off") {
        button.classList.add("key--toggle-animate-off");
      }
      button.setAttribute("aria-pressed", storageToggleActive ? "true" : "false");
      button.disabled = false;
      bindDraggableCell(button, state, dispatch, { surface: "storage", index }, cell.key);
      appendDebugSlotLabel(button, slotLabel);
      storageEl.appendChild(button);
    }
  }

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





