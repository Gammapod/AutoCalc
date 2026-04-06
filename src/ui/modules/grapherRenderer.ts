import type { GameState } from "../../domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow, isGraphRenderable, type GraphPoint } from "./visualizers/graphModel.js";
import { toStepCount } from "../../domain/rollEntries.js";
import { forEachUiRootRuntime, getOrCreateRuntime } from "../runtime/registry.js";
import { ensureChartLoaded } from "../../infra/runtime/lazyAssetLoader.js";
import { resolveUxRoleColor } from "../shared/readModel.js";

type GraphDataset = {
  data: GraphPoint[];
  showLine: boolean;
  pointRadius: number | number[];
  pointHoverRadius: number | number[];
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
    padding?: number;
    maxRotation?: number;
    minRotation?: number;
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
  layout?: {
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
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

export type GrapherModuleState = {
  graphChart: ChartHandle | null;
  graphCanvas: HTMLCanvasElement | null;
};

const createGrapherRuntime = (): GrapherModuleState => ({
  graphChart: null,
  graphCanvas: null,
});

const clearGrapherRuntime = (runtime: GrapherModuleState): void => {
  runtime.graphChart?.destroy();
  runtime.graphChart = null;
  runtime.graphCanvas = null;
};

const getGrapherRuntime = (root: Element): GrapherModuleState => {
  const moduleRuntime = getOrCreateRuntime(root).grapher;
  if (moduleRuntime.moduleState) {
    return moduleRuntime.moduleState;
  }
  const created = createGrapherRuntime();
  moduleRuntime.moduleState = created;
  moduleRuntime.dispose = () => {
    clearGrapherRuntime(created);
    moduleRuntime.moduleState = createGrapherRuntime();
  };
  moduleRuntime.resetForTests = () => {
    clearGrapherRuntime(created);
  };
  return created;
};

const buildGraphOptions = (
  hasPoints: boolean,
  rollEntries: GameState["calculator"]["rollEntries"],
  maxXIndex: number,
  radix: number,
  documentRef: Document | null,
): GraphOptions => {
  const xWindow = buildGraphXWindow(maxXIndex);
  const bounds = buildGraphYWindow(rollEntries, radix);
  const defaultColor = resolveUxRoleColor("default", { document: documentRef });
  const defaultGrid = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.2 });
  const defaultGridAxis = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.75 });
  const defaultBorder = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.45 });
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
    layout: {
      // Reserve canvas space for axis labels so large values do not clip.
      padding: {
        top: 2,
        right: 10,
        bottom: 12,
        left: 10,
      },
    },
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
          color: defaultColor,
          precision: 0,
          autoSkip: true,
          padding: 4,
          maxRotation: 0,
          minRotation: 0,
          callback: makeXAxisTickLabelCallback(xWindow.max),
        },
        grid: { color: defaultGrid, display: true },
        border: { color: defaultBorder, display: true },
      },
      y: {
        min: bounds.min,
        max: bounds.max,
        display: true,
        ticks: {
          color: defaultColor,
          autoSkip: false,
          padding: 4,
          maxRotation: 0,
          minRotation: 0,
          callback: makeYAxisTickLabelCallback(bounds.min, bounds.max),
        },
        grid: {
          color: (context: { tick?: { value?: number | string } }) => {
            const value = context.tick?.value;
            const numeric = typeof value === "number" ? value : Number(value);
            return Number.isFinite(numeric) && Math.abs(numeric) < 1e-9
              ? defaultGridAxis
              : defaultGrid;
          },
          lineWidth: (context: { tick?: { value?: number | string } }) => {
            const value = context.tick?.value;
            const numeric = typeof value === "number" ? value : Number(value);
            return Number.isFinite(numeric) && Math.abs(numeric) < 1e-9 ? 2 : 1;
          },
          display: true,
        },
        border: { color: defaultBorder, display: true },
      },
    },
  };
};

export const clearGrapherV2Module = (root?: Element): void => {
  if (root) {
    clearGrapherRuntime(getGrapherRuntime(root));
    return;
  }
  forEachUiRootRuntime((runtime) => {
    const grapherRuntime = runtime.grapher.moduleState;
    if (grapherRuntime) {
      clearGrapherRuntime(grapherRuntime);
    }
  });
};

export const renderGrapherV2Module = (root: Element, state: GameState): void => {
  const runtime = getGrapherRuntime(root);
  const graphVisible = state.settings.visualizer === "graph";
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
    void ensureChartLoaded().then((loaded) => {
      if (!loaded) {
        return;
      }
      renderGrapherV2Module(root, state);
    });
    return;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const points = buildGraphPoints(state.calculator.rollEntries);
  const hasPoints = isGraphRenderable(state.calculator.rollEntries);
  const displayRadix = state.settings.base === "base2" ? 2 : 10;
  const options = buildGraphOptions(
    hasPoints,
    state.calculator.rollEntries,
    toStepCount(state.calculator.rollEntries),
    displayRadix,
    root.ownerDocument ?? null,
  );
  const defaultColor = resolveUxRoleColor("default", { document: root.ownerDocument ?? null });
  const analysisColor = resolveUxRoleColor("analysis", { document: root.ownerDocument ?? null });
  const errorColor = resolveUxRoleColor("error", { document: root.ownerDocument ?? null });
  const defaultBorderColor = resolveUxRoleColor("default", { document: root.ownerDocument ?? null, alpha01: 0.9 });
  const analysisBorderColor = resolveUxRoleColor("analysis", { document: root.ownerDocument ?? null, alpha01: 0.9 });
  const errorBorderColor = resolveUxRoleColor("error", { document: root.ownerDocument ?? null, alpha01: 0.9 });
  const pointBackgroundColor = points.map((point) => {
    if (point.kind === "remainder" || point.kind === "imaginary") {
      return analysisColor;
    }
    return point.hasError ? errorColor : defaultColor;
  });
  const pointBorderColor = points.map((point) => {
    if (point.kind === "remainder" || point.kind === "imaginary") {
      return analysisBorderColor;
    }
    return point.hasError ? errorBorderColor : defaultBorderColor;
  });
  const pointRadius = points.map((point) => (point.kind === "imaginary" ? 2.25 : (hasPoints ? 3 : 0)));
  const pointHoverRadius = points.map((point) => (point.kind === "imaginary" ? 3.25 : 4));

  if (!runtime.graphChart) {
    runtime.graphChart = new chartCtor(context, {
      type: "scatter",
      data: {
        datasets: [
          {
            data: points,
            showLine: false,
            pointRadius,
            pointHoverRadius,
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
  runtime.graphChart.data.datasets[0].pointRadius = pointRadius;
  runtime.graphChart.data.datasets[0].pointHoverRadius = pointHoverRadius;
  runtime.graphChart.data.datasets[0].pointBackgroundColor = pointBackgroundColor;
  runtime.graphChart.data.datasets[0].pointBorderColor = pointBorderColor;
  runtime.graphChart.options = options;
  runtime.graphChart.update("none");
};
