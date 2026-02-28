import { unlockCatalog } from "../content/unlocks.catalog.js";
import { CHECKLIST_UNLOCK_ID } from "../domain/state.js";
import { buildUnlockCriteria } from "../domain/unlockEngine.js";
import type {
  Action,
  EuclidRemainderEntry,
  GameState,
  Key,
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
let graphChart: ChartHandle | null = null;
let graphCanvas: HTMLCanvasElement | null = null;
let grapherResizeObserver: ResizeObserver | null = null;
let observedCalculatorDevice: HTMLElement | null = null;
const GRAPH_WINDOW_SIZE = 25;
const GRAPH_MIN_Y_RANGE = 15;
const KEYPAD_COLUMNS = 4;

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
export const formatKeyLabel = (key: Key): string =>
  key === "NEG"
    ? "-\u{1D465}"
    : key === "#"
      ? "#/⟡"
      : key === "⟡"
        ? "⟡"
        : key === "*" || key === "/"
          ? formatOperatorForDisplay(key)
          : key;

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
    (slot) => `[ ${formatOperatorForDisplay(slot.operator)} ${slot.operand.toString()} ]`,
  );
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput
      ? `${state.calculator.draftingSlot.isNegative ? "-" : ""}${state.calculator.draftingSlot.operandInput}`
      : state.calculator.draftingSlot.isNegative
        ? "-_"
        : "_";
    filledTokens.push(`[ ${formatOperatorForDisplay(state.calculator.draftingSlot.operator)} ${operand} ]`);
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

const ensureGrapherHeightSync = (root: Element): void => {
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const grapherDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  if (!calculatorDevice || !grapherDevice) {
    return;
  }

  const syncHeight = (): void => {
    const calculatorHeight = calculatorDevice.getBoundingClientRect().height;
    grapherDevice.style.height = `${Math.max(120, Math.round(calculatorHeight * 0.5))}px`;
  };

  syncHeight();

  if (typeof ResizeObserver === "undefined") {
    return;
  }

  if (observedCalculatorDevice !== calculatorDevice) {
    grapherResizeObserver?.disconnect();
    grapherResizeObserver = new ResizeObserver(() => {
      syncHeight();
    });
    grapherResizeObserver.observe(calculatorDevice);
    observedCalculatorDevice = calculatorDevice;
  }
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
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "⟡") {
    return state.unlocks.slotOperators[key];
  }
  if (key === "C" || key === "CE") {
    return state.unlocks.utilities[key];
  }
  if (key === "=") {
    return state.unlocks.execution["="];
  }
  return false;
};

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  if (/^\d$/.test(key) || key === "NEG") {
    return "value_expression";
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "⟡") {
    return "slot_operator";
  }
  if (key === "C" || key === "CE") {
    return "utility";
  }
  return "execution";
};

const toGridKey = (row: number, column: number): string => `${row}:${column}`;

const canPlaceGridCell = (
  occupied: Set<string>,
  row: number,
  column: number,
  colSpan: number,
  rowSpan: number,
): boolean => {
  if (column + colSpan - 1 > KEYPAD_COLUMNS) {
    return false;
  }
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      if (occupied.has(toGridKey(row + rowOffset, column + colOffset))) {
        return false;
      }
    }
  }
  return true;
};

const claimGridCells = (occupied: Set<string>, row: number, column: number, colSpan: number, rowSpan: number): void => {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      occupied.add(toGridKey(row + rowOffset, column + colOffset));
    }
  }
};

const buildKeypadSlotLabels = (layout: GameState["ui"]["keyLayout"]): string[] => {
  const labels: string[] = [];
  const occupied = new Set<string>();
  let searchIndex = 0;

  for (let index = 0; index < layout.length; index += 1) {
    const cell = layout[index];
    const colSpan = cell.kind === "key" && cell.wide ? 2 : 1;
    const rowSpan = cell.kind === "key" && cell.tall ? 2 : 1;

    while (true) {
      const row = Math.floor(searchIndex / KEYPAD_COLUMNS) + 1;
      const column = (searchIndex % KEYPAD_COLUMNS) + 1;
      if (canPlaceGridCell(occupied, row, column, colSpan, rowSpan)) {
        claimGridCells(occupied, row, column, colSpan, rowSpan);
        labels.push(`R${row}C${column} #${index}`);
        searchIndex += 1;
        break;
      }
      searchIndex += 1;
    }
  }

  return labels;
};

const appendDebugSlotLabel = (cellElement: HTMLElement, label: string): void => {
  const slotLabel = document.createElement("span");
  slotLabel.className = "slot-label";
  slotLabel.setAttribute("aria-hidden", "true");
  slotLabel.textContent = label;
  cellElement.appendChild(slotLabel);
};

export const render = (root: Element, state: GameState, dispatch: (action: Action) => unknown): void => {
  const totalEl = root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl) {
    throw new Error("UI mount points are missing.");
  }

  ensureGrapherHeightSync(root);
  renderGraphDisplay(root, state.calculator.roll);

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

  keysEl.innerHTML = "";
  const slotLabels = buildKeypadSlotLabels(state.ui.keyLayout);
  for (let index = 0; index < state.ui.keyLayout.length; index += 1) {
    const cell = state.ui.keyLayout[index];
    const slotLabel = slotLabels[index] ?? `#${index}`;
    if (cell.kind === "placeholder") {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      appendDebugSlotLabel(placeholder, slotLabel);
      keysEl.appendChild(placeholder);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    button.classList.add(`key--group-${getKeyVisualGroup(cell.key)}`);
    if (cell.wide) {
      button.classList.add("key--wide");
    }
    if (cell.tall) {
      button.classList.add("key--tall");
    }
    button.textContent = formatKeyLabel(cell.key);
    button.disabled = !isKeyUnlocked(state, cell.key);
    appendDebugSlotLabel(button, slotLabel);
    button.addEventListener("click", () => {
      dispatch({ type: "PRESS_KEY", key: cell.key });
    });
    keysEl.appendChild(button);
  }
};
