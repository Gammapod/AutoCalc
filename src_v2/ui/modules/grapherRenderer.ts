import { GRAPH_VISIBLE_FLAG } from "../../../src/domain/state.js";
import type { GameState } from "../../../src/domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow, isGraphRenderable, type GraphPoint } from "./visualizers/graphModel.js";

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

const buildGraphOptions = (hasPoints: boolean, points: GraphPoint[], unlockedTotalDigits: number): GraphOptions => {
  const bounds = buildGraphYWindow(unlockedTotalDigits);
  const xWindow = buildGraphXWindow(points.length);
  const defaultWindowMax = buildGraphXWindow(0).max;
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
        max: hasPoints ? xWindow.max : defaultWindowMax,
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
        border: { color: "rgba(188, 255, 214, 0.45)", display: true },
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
  const graphVisible = Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]);
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
  const hasPoints = isGraphRenderable(state.calculator.roll, state.calculator.rollErrors);
  const options = buildGraphOptions(hasPoints, points, state.unlocks.maxTotalDigits);
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
