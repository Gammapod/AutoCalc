import type { GameState } from "../../domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow, isGraphRenderable, type GraphPoint } from "./visualizers/graphModel.js";
import { resolveGraphSeedSnapshot } from "./visualizers/seedSnapshot.js";

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

type GrapherRuntime = {
  graphChart: ChartHandle | null;
  graphCanvas: HTMLCanvasElement | null;
};

const grapherRuntimeByRoot = new WeakMap<Element, GrapherRuntime>();
const grapherRuntimes = new Set<GrapherRuntime>();

const getGrapherRuntime = (root: Element): GrapherRuntime => {
  const existing = grapherRuntimeByRoot.get(root);
  if (existing) {
    return existing;
  }
  const created: GrapherRuntime = {
    graphChart: null,
    graphCanvas: null,
  };
  grapherRuntimeByRoot.set(root, created);
  grapherRuntimes.add(created);
  return created;
};

const buildGraphOptions = (hasPoints: boolean, points: GraphPoint[], maxXIndex: number, unlockedTotalDigits: number): GraphOptions => {
  const xWindow = buildGraphXWindow(maxXIndex);
  const bounds = buildGraphYWindow(unlockedTotalDigits);
  const defaultWindowMax = buildGraphXWindow(0).max;
  const makeXAxisTickLabelCallback =
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
  const makeYAxisTickLabelCallback =
    (axisMin: number, axisMax: number) =>
    (value: string | number): string => {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric)) {
        return "";
      }
      if (Math.abs(numeric - axisMin) < 1e-9 || Math.abs(numeric) < 1e-9 || Math.abs(numeric - axisMax) < 1e-9) {
        return Math.trunc(numeric).toString();
      }
      return "";
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
        display: true,
        ticks: {
          color: "#bcffd6",
          precision: 0,
          autoSkip: true,
          callback: makeXAxisTickLabelCallback(xWindow.max),
        },
        grid: { color: "rgba(188, 255, 214, 0.2)", display: true },
        border: { color: "rgba(188, 255, 214, 0.45)", display: true },
      },
      y: {
        min: bounds.min,
        max: bounds.max,
        display: true,
        ticks: {
          color: "#bcffd6",
          autoSkip: false,
          callback: makeYAxisTickLabelCallback(bounds.min, bounds.max),
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

export const clearGrapherV2Module = (root?: Element): void => {
  if (root) {
    const runtime = grapherRuntimeByRoot.get(root);
    runtime?.graphChart?.destroy();
    if (runtime) {
      runtime.graphChart = null;
      runtime.graphCanvas = null;
    }
    return;
  }
  for (const runtime of grapherRuntimes) {
    runtime.graphChart?.destroy();
    runtime.graphChart = null;
    runtime.graphCanvas = null;
  }
};

export const renderGrapherV2Module = (root: Element, state: GameState): void => {
  const runtime = getGrapherRuntime(root);
  const graphVisible = state.ui.activeVisualizer === "graph";
  if (!graphVisible) {
    clearGrapherV2Module(root);
    return;
  }

  const canvas = root.querySelector<HTMLCanvasElement>("[data-grapher-canvas]");
  if (!canvas) {
    clearGrapherV2Module(root);
    return;
  }
  if (runtime.graphCanvas !== canvas) {
    clearGrapherV2Module(root);
    runtime.graphCanvas = canvas;
  }

  const chartCtor = (window as Window & { Chart?: ChartCtor }).Chart;
  if (!chartCtor) {
    return;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const graphSeedSnapshot = resolveGraphSeedSnapshot(state);
  const points = buildGraphPoints(state.calculator.rollEntries, graphSeedSnapshot);
  const hasPoints = isGraphRenderable(state.calculator.rollEntries, graphSeedSnapshot);
  const options = buildGraphOptions(hasPoints, points, state.calculator.rollEntries.length, state.unlocks.maxTotalDigits);
  const pointBackgroundColor = points.map((point) => {
    if (point.kind === "remainder") {
      return "#ffd84d";
    }
    return point.hasError ? "#ff6f6f" : "#bcffd6";
  });
  const pointBorderColor = points.map((point) => {
    if (point.kind === "remainder") {
      return "rgba(255, 216, 77, 0.9)";
    }
    return point.hasError ? "rgba(255, 111, 111, 0.9)" : "rgba(188, 255, 214, 0.9)";
  });

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
