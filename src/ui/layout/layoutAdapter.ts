import { computeLayoutSnapshot, getActiveCalculatorSnapshot } from "./layoutEngine.js";
import type {
  CalculatorInstanceLayoutConfig,
  CalculatorLayoutSnapshot,
  LayoutEngineInput,
  WorkbenchViewportModel,
} from "./types.js";

const DEFAULT_CALCULATOR_INSTANCE_ID = "primary";
const DEFAULT_GAP_PX = 10;

const parsePxValue = (value: string, fallback: number): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFinitePositive = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

const parseVisualizerWidthMode = (value: string | undefined): "coupled" | "fixed" =>
  value === "fixed" ? "fixed" : "coupled";

const resolveVisualizerWidthConfig = (
  root: Element,
): { visualizerWidthMode: "coupled" | "fixed"; visualizerWidthPx?: number } => {
  const rootEl = root instanceof HTMLElement ? root : null;
  const datasetMode = rootEl?.dataset.visualizerWidthMode;
  const datasetWidth = rootEl?.dataset.visualizerWidthPx;

  const computedStyle = typeof window !== "undefined" && rootEl ? window.getComputedStyle(rootEl) : null;
  const cssMode = computedStyle?.getPropertyValue("--desktop-visualizer-width-mode")?.trim();
  const cssWidth = computedStyle?.getPropertyValue("--desktop-visualizer-width-px")?.trim();

  const visualizerWidthMode = parseVisualizerWidthMode(datasetMode || cssMode || undefined);
  const visualizerWidthPx = parseFinitePositive(datasetWidth || cssWidth || undefined);

  if (visualizerWidthMode === "fixed" && visualizerWidthPx !== undefined) {
    return {
      visualizerWidthMode,
      visualizerWidthPx,
    };
  }
  return {
    visualizerWidthMode: "coupled",
  };
};

const isDesktopUiShell = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.getAttribute("data-ui-shell") === "desktop";
};

export const isDesktopShellContext = (root: Element): boolean => {
  if (isDesktopUiShell()) {
    return true;
  }
  return !!root.querySelector<HTMLElement>(".play-area[data-desktop-shell='true']");
};

export type BuildSingleInstanceLayoutInputParams = {
  root: Element;
  keysEl: HTMLElement;
  calcBodyEl: HTMLElement | null;
  columns: number;
  rows: number;
  inputBlocked: boolean;
};

export const buildSingleInstanceLayoutInput = ({
  root,
  keysEl,
  calcBodyEl,
  columns,
  rows,
  inputBlocked,
}: BuildSingleInstanceLayoutInputParams): LayoutEngineInput => {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720;
  const computedGap = typeof window !== "undefined" ? window.getComputedStyle(keysEl).getPropertyValue("--gap") : "";
  const gapPx = parsePxValue(computedGap, DEFAULT_GAP_PX);
  const calcRect = calcBodyEl?.getBoundingClientRect();
  const keysRect = keysEl.getBoundingClientRect();
  const measuredVerticalChromePx = calcRect && keysRect ? calcRect.height - keysRect.height : null;
  const visualizerConfig = resolveVisualizerWidthConfig(root);

  const calculatorInstances: CalculatorInstanceLayoutConfig[] = [
    {
      id: DEFAULT_CALCULATOR_INSTANCE_ID,
      keypadColumns: columns,
      keypadRows: rows,
      baselineColumns: 4,
      baselineRows: 2,
      keyHeightRatioToViewport: 0.056,
      keyHeightMinPx: 46,
      keyHeightMaxPx: 56,
      keyMinWidthAspect: 1.5,
      horizontalChromePx: 32,
      verticalChromeFloorPx: 120,
      verticalChromeFallbackPx: 260,
      visualizerWidthMode: visualizerConfig.visualizerWidthMode,
      ...(visualizerConfig.visualizerWidthPx !== undefined ? { visualizerWidthPx: visualizerConfig.visualizerWidthPx } : {}),
    },
  ];

  const workbench: WorkbenchViewportModel = {
    activeCalculatorId: DEFAULT_CALCULATOR_INSTANCE_ID,
    order: [DEFAULT_CALCULATOR_INSTANCE_ID],
    xOffsetPx: 0,
    minOffsetPx: 0,
    maxOffsetPx: 0,
  };

  return {
    viewport: {
      widthPx: viewportWidth,
      heightPx: viewportHeight,
    },
    shellMode: isDesktopShellContext(root) ? "desktop" : "mobile",
    inputBlocked,
    gapPx,
    measuredVerticalChromePx,
    calculatorInstances,
    activeCalculatorId: DEFAULT_CALCULATOR_INSTANCE_ID,
    workbench,
  };
};

export const resolveSingleInstanceSnapshot = (params: BuildSingleInstanceLayoutInputParams): CalculatorLayoutSnapshot => {
  const input = buildSingleInstanceLayoutInput(params);
  const snapshot = computeLayoutSnapshot(input);
  const active = getActiveCalculatorSnapshot(snapshot);
  if (!active) {
    throw new Error("Layout snapshot did not produce an active calculator.");
  }
  return active;
};

export const applyDesktopLayoutSnapshot = (
  keysEl: HTMLElement,
  calcBodyEl: HTMLElement | null,
  snapshot: CalculatorLayoutSnapshot,
): void => {
  const targets = calcBodyEl ? [keysEl, calcBodyEl] : [keysEl];
  for (const element of targets) {
    element.style.setProperty("--desktop-calc-cols", snapshot.keypad.columns.toString());
    element.style.setProperty("--desktop-calc-rows", snapshot.keypad.rows.toString());
    element.style.setProperty("--desktop-key-min-width", `${snapshot.keypad.keyMinWidthPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-calc-width", `${snapshot.body.widthPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-calc-min-height", `${snapshot.body.minHeightPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-baseline-width", `${snapshot.body.baselineWidthPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-baseline-calc-height", `${snapshot.body.baselineMinHeightPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-baseline-keypad-height", `${snapshot.keypad.baselineKeypadHeightPx.toFixed(2)}px`);
    element.style.setProperty("--desktop-visualizer-width", `${snapshot.visualizer.widthPx.toFixed(2)}px`);
  }
  keysEl.style.gridTemplateColumns = snapshot.keypad.gridTemplateColumns;
  keysEl.style.gridTemplateRows = snapshot.keypad.gridTemplateRows;
  if (snapshot.keypad.heightPx !== null) {
    keysEl.style.height = `${snapshot.keypad.heightPx.toFixed(2)}px`;
  } else {
    keysEl.style.removeProperty("height");
  }
};

export const clearDesktopSizingVars = (keysEl: HTMLElement, calcBodyEl: HTMLElement | null): void => {
  keysEl.style.removeProperty("--desktop-calc-cols");
  keysEl.style.removeProperty("--desktop-calc-rows");
  keysEl.style.removeProperty("--desktop-key-min-width");
  keysEl.style.removeProperty("--desktop-calc-width");
  keysEl.style.removeProperty("--desktop-calc-min-height");
  keysEl.style.removeProperty("--desktop-baseline-width");
  keysEl.style.removeProperty("--desktop-baseline-calc-height");
  keysEl.style.removeProperty("--desktop-baseline-keypad-height");
  keysEl.style.removeProperty("--desktop-visualizer-width");
  if (!calcBodyEl) {
    return;
  }
  calcBodyEl.style.removeProperty("--desktop-calc-cols");
  calcBodyEl.style.removeProperty("--desktop-calc-rows");
  calcBodyEl.style.removeProperty("--desktop-key-min-width");
  calcBodyEl.style.removeProperty("--desktop-calc-width");
  calcBodyEl.style.removeProperty("--desktop-calc-min-height");
  calcBodyEl.style.removeProperty("--desktop-baseline-width");
  calcBodyEl.style.removeProperty("--desktop-baseline-calc-height");
  calcBodyEl.style.removeProperty("--desktop-baseline-keypad-height");
  calcBodyEl.style.removeProperty("--desktop-visualizer-width");
};
