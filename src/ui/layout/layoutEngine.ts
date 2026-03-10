import type {
  CalculatorInstanceLayoutConfig,
  CalculatorLayoutSnapshot,
  LayoutEngineInput,
  LayoutSnapshot,
  WorkbenchViewportModel,
} from "./types.js";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const sanitizePositive = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
};

const resolveVerticalChrome = (
  measuredVerticalChromePx: number | null,
  config: CalculatorInstanceLayoutConfig,
): number => {
  const measured = measuredVerticalChromePx ?? 0;
  const fallback = sanitizePositive(config.verticalChromeFallbackPx, 260);
  const floor = sanitizePositive(config.verticalChromeFloorPx, 120);
  const candidate = measured > 0 ? measured : fallback;
  return Math.max(floor, candidate);
};

const buildCalculatorSnapshot = (
  input: LayoutEngineInput,
  config: CalculatorInstanceLayoutConfig,
): CalculatorLayoutSnapshot => {
  const columns = Math.max(1, Math.trunc(config.keypadColumns));
  const rows = Math.max(1, Math.trunc(config.keypadRows));
  const baselineColumns = Math.max(1, Math.trunc(config.baselineColumns));
  const baselineRows = Math.max(1, Math.trunc(config.baselineRows));

  const viewportHeight = sanitizePositive(input.viewport.heightPx, 720);
  const gap = sanitizePositive(input.gapPx, 10);
  const keyHeight = clamp(
    viewportHeight * config.keyHeightRatioToViewport,
    sanitizePositive(config.keyHeightMinPx, 46),
    sanitizePositive(config.keyHeightMaxPx, 56),
  );
  const keyMinWidth = keyHeight * sanitizePositive(config.keyMinWidthAspect, 1.5);

  const effectiveColumns = Math.max(columns, baselineColumns);
  const effectiveRows = Math.max(rows, baselineRows);
  const horizontalChrome = sanitizePositive(config.horizontalChromePx, 32);

  const baselineWidth = baselineColumns * keyMinWidth + Math.max(0, baselineColumns - 1) * gap + horizontalChrome;
  const bodyWidth = effectiveColumns * keyMinWidth + Math.max(0, effectiveColumns - 1) * gap + horizontalChrome;

  const baselineKeypadHeight = baselineRows * keyHeight + Math.max(0, baselineRows - 1) * gap;
  const keypadHeight = effectiveRows * keyHeight + Math.max(0, effectiveRows - 1) * gap;
  const verticalChrome = resolveVerticalChrome(input.measuredVerticalChromePx, config);

  const baselineMinHeight = baselineKeypadHeight + verticalChrome;
  const bodyMinHeight = keypadHeight + verticalChrome;
  const shouldStretchKeypadHeight = rows < baselineRows;

  const resolvedBodyWidth = Math.max(bodyWidth, baselineWidth);
  const resolvedBodyMinHeight = Math.max(bodyMinHeight, baselineMinHeight);

  const visualizerWidth =
    config.visualizerWidthMode === "fixed" && Number.isFinite(config.visualizerWidthPx)
      ? Math.max(1, config.visualizerWidthPx ?? resolvedBodyWidth)
      : resolvedBodyWidth;

  return {
    id: config.id,
    shellMode: input.shellMode,
    inputBlocked: input.inputBlocked,
    body: {
      widthPx: resolvedBodyWidth,
      minHeightPx: resolvedBodyMinHeight,
      baselineWidthPx: baselineWidth,
      baselineMinHeightPx: baselineMinHeight,
    },
    keypad: {
      columns,
      rows,
      keyHeightPx: keyHeight,
      keyMinWidthPx: keyMinWidth,
      gapPx: gap,
      baselineKeypadHeightPx: baselineKeypadHeight,
      shouldStretchKeypadHeight,
      gridTemplateColumns: `repeat(${columns.toString()}, minmax(var(--desktop-key-min-width), 1fr))`,
      gridTemplateRows: shouldStretchKeypadHeight
        ? `repeat(${rows.toString()}, minmax(var(--desktop-key-height), 1fr))`
        : `repeat(${rows.toString()}, var(--desktop-key-height))`,
      heightPx: shouldStretchKeypadHeight ? baselineKeypadHeight : null,
    },
    visualizer: {
      widthPx: visualizerWidth,
    },
    invariants: {
      keypadBodyHorizontalInsetPx: horizontalChrome / 2,
      keypadBodyVerticalInsetPx: verticalChrome,
    },
  };
};

const normalizeWorkbench = (workbench: WorkbenchViewportModel, fallbackActiveCalculatorId: string): WorkbenchViewportModel => {
  const order = workbench.order.length > 0 ? workbench.order : [fallbackActiveCalculatorId];
  return {
    activeCalculatorId: workbench.activeCalculatorId || fallbackActiveCalculatorId,
    order,
    xOffsetPx: workbench.xOffsetPx,
    minOffsetPx: workbench.minOffsetPx,
    maxOffsetPx: workbench.maxOffsetPx,
  };
};

export const computeLayoutSnapshot = (input: LayoutEngineInput): LayoutSnapshot => {
  const activeId = input.activeCalculatorId || input.calculatorInstances[0]?.id || "primary";
  const calculators = input.calculatorInstances.map((instance) => buildCalculatorSnapshot(input, instance));
  return {
    workbench: normalizeWorkbench(input.workbench, activeId),
    calculators,
    activeCalculatorId: activeId,
  };
};

export const getActiveCalculatorSnapshot = (snapshot: LayoutSnapshot): CalculatorLayoutSnapshot | null =>
  snapshot.calculators.find((calculator) => calculator.id === snapshot.activeCalculatorId) ?? snapshot.calculators[0] ?? null;
