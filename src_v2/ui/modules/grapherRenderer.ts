import { GRAPH_VISIBLE_FLAG } from "../../../src/domain/state.js";
import { isRationalCalculatorValue } from "../../../src/domain/calculatorValue.js";
import type { CalculatorValue, GameState, RollErrorEntry } from "../../../src/domain/types.js";

type GraphPoint = {
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
    callback?: (value: string | number) => string | number;
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
    legend: { display: boolean };
    tooltip: { enabled: boolean };
  };
  scales: {
    x: GraphScale;
    y: GraphScale;
  };
};

type GraphChartConfig = {
  type: "scatter";
  data: { datasets: GraphDataset[] };
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

let graphChart: ChartHandle | null = null;
let graphCanvas: HTMLCanvasElement | null = null;

const GRAPH_WINDOW_SIZE = 25;
const GRAPH_MIN_Y_RANGE = 15;

const buildGraphPoints = (roll: CalculatorValue[], rollErrors: RollErrorEntry[] = []): GraphPoint[] => {
  const errorByRollIndex = new Set(rollErrors.map((entry) => entry.rollIndex));
  const points: GraphPoint[] = [];
  for (let index = 0; index < roll.length; index += 1) {
    const value = roll[index];
    if (!isRationalCalculatorValue(value)) {
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: errorByRollIndex.has(index),
    });
  }
  return points;
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

const buildGraphXWindow = (rollLength: number): { min: number; max: number } => {
  if (rollLength < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: rollLength - GRAPH_WINDOW_SIZE, max: rollLength - 1 };
};

const buildGraphOptions = (hasPoints: boolean, points: GraphPoint[]): GraphOptions => {
  const bounds = hasPoints ? getGraphBounds(points) : { min: 0, max: 1 };
  const xWindow = buildGraphXWindow(points.length);
  const makeTickLabelCallback =
    (axisMax: number) =>
    (value: string | number): string => {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric) || Math.abs(numeric - axisMax) < 1e-9) {
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
        grid: { color: "rgba(188, 255, 214, 0.2)", display: hasPoints },
        border: { color: "rgba(188, 255, 214, 0.45)", display: hasPoints },
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
        grid: { color: "rgba(188, 255, 214, 0.2)", display: hasPoints },
        border: { color: "rgba(188, 255, 214, 0.45)", display: hasPoints },
      },
    },
  };
};

export const clearGrapherV2Module = (): void => {
  graphChart?.destroy();
  graphChart = null;
  graphCanvas = null;
};

export const renderGrapherV2Module = (root: Element, state: GameState): void => {
  const grapherDeviceEl = root.querySelector<HTMLElement>("[data-grapher-device]");
  const graphVisible = Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]);
  if (grapherDeviceEl) {
    grapherDeviceEl.hidden = !graphVisible;
  }
  if (!graphVisible) {
    clearGrapherV2Module();
    return;
  }

  const canvas = root.querySelector<HTMLCanvasElement>("[data-grapher-canvas]");
  if (!canvas) {
    clearGrapherV2Module();
    return;
  }
  if (graphCanvas !== canvas) {
    clearGrapherV2Module();
    graphCanvas = canvas;
  }

  const chartCtor = (window as Window & { Chart?: ChartCtor }).Chart;
  if (!chartCtor) {
    return;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const points = buildGraphPoints(state.calculator.roll, state.calculator.rollErrors);
  const hasPoints = points.length > 0;
  const options = buildGraphOptions(hasPoints, points);
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
