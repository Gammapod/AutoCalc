import type { GameState } from "../../domain/types.js";
import { toStepCount } from "../../domain/rollEntries.js";
import { forEachUiRootRuntime, getOrCreateRuntime } from "../runtime/registry.js";
import { ensureChartLoaded } from "../../infra/runtime/lazyAssetLoader.js";
import { resolveUxRoleColor } from "../shared/readModel.js";
import { buildGraphPoints, isGraphRenderable, type GraphPoint } from "./visualizers/graphModel.js";
import { resolveGraphLayout } from "./visualizers/graphLayoutModel.js";
import { clearGraphOverlay, renderGraphOverlay } from "./visualizers/graphOverlayRenderer.js";

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
  min?: number;
  max?: number;
  display?: boolean;
  ticks?: {
    display?: boolean;
  };
  grid?: {
    display?: boolean;
  };
  border?: {
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

const clearGrapherRuntime = (runtime: GrapherModuleState, root?: Element): void => {
  runtime.graphChart?.destroy();
  runtime.graphChart = null;
  runtime.graphCanvas = null;
  if (root) {
    clearGraphOverlay(root);
  }
};

const getGrapherRuntime = (root: Element): GrapherModuleState => {
  const moduleRuntime = getOrCreateRuntime(root).grapher;
  if (moduleRuntime.moduleState) {
    return moduleRuntime.moduleState;
  }
  const created = createGrapherRuntime();
  moduleRuntime.moduleState = created;
  moduleRuntime.dispose = () => {
    clearGrapherRuntime(created, root);
    moduleRuntime.moduleState = createGrapherRuntime();
  };
  moduleRuntime.resetForTests = () => {
    clearGrapherRuntime(created, root);
  };
  return created;
};

const resolveCanvasDimensions = (canvas: HTMLCanvasElement): { width: number; height: number } => {
  const rect = canvas.getBoundingClientRect();
  const width = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : (canvas.clientWidth || 420);
  const height = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : (canvas.clientHeight || 250);
  return { width, height };
};

const buildGraphOptions = (
  hasPoints: boolean,
  layout: ReturnType<typeof resolveGraphLayout>,
): GraphOptions => ({
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      left: layout.plot.left,
      right: layout.width - layout.plot.right,
      top: layout.plot.top,
      bottom: layout.height - layout.plot.bottom,
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: hasPoints },
  },
  scales: {
    x: {
      min: layout.xDomain.min,
      max: layout.xDomain.max,
      display: false,
      ticks: { display: false },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      min: layout.yDomain.min,
      max: layout.yDomain.max,
      display: false,
      ticks: { display: false },
      grid: { display: false },
      border: { display: false },
    },
  },
});

export const clearGrapherV2Module = (root?: Element): void => {
  if (root) {
    clearGrapherRuntime(getGrapherRuntime(root), root);
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
  const dimensions = resolveCanvasDimensions(canvas);
  const layout = resolveGraphLayout(
    state.calculator.rollEntries,
    displayRadix,
    toStepCount(state.calculator.rollEntries),
    dimensions.width,
    dimensions.height,
  );

  const options = buildGraphOptions(hasPoints, layout);
  const documentRef = root.ownerDocument ?? null;
  const defaultColor = resolveUxRoleColor("default", { document: documentRef });
  const analysisColor = resolveUxRoleColor("analysis", { document: documentRef });
  const errorColor = resolveUxRoleColor("error", { document: documentRef });
  const defaultBorderColor = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.9 });
  const analysisBorderColor = resolveUxRoleColor("analysis", { document: documentRef, alpha01: 0.9 });
  const errorBorderColor = resolveUxRoleColor("error", { document: documentRef, alpha01: 0.9 });

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
  } else {
    runtime.graphChart.data.datasets[0].data = points;
    runtime.graphChart.data.datasets[0].pointRadius = pointRadius;
    runtime.graphChart.data.datasets[0].pointHoverRadius = pointHoverRadius;
    runtime.graphChart.data.datasets[0].pointBackgroundColor = pointBackgroundColor;
    runtime.graphChart.data.datasets[0].pointBorderColor = pointBorderColor;
    runtime.graphChart.options = options;
    runtime.graphChart.update("none");
  }

  const gridColor = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.2 });
  const axisColor = resolveUxRoleColor("default", { document: documentRef, alpha01: 0.75 });
  renderGraphOverlay(root, layout, {
    gridColor,
    axisColor,
    labelColor: defaultColor,
  });
};
