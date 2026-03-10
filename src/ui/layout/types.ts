export type UiShellLayoutMode = "desktop" | "mobile";

export type WorkbenchViewportModel = {
  activeCalculatorId: string;
  order: string[];
  xOffsetPx: number;
  minOffsetPx: number;
  maxOffsetPx: number;
};

export type CalculatorInstanceLayoutConfig = {
  id: string;
  keypadColumns: number;
  keypadRows: number;
  baselineColumns: number;
  baselineRows: number;
  keyHeightRatioToViewport: number;
  keyHeightMinPx: number;
  keyHeightMaxPx: number;
  keyMinWidthAspect: number;
  horizontalChromePx: number;
  verticalChromeFloorPx: number;
  verticalChromeFallbackPx: number;
  visualizerWidthMode: "coupled" | "fixed";
  visualizerWidthPx?: number;
};

export type LayoutEngineInput = {
  viewport: {
    widthPx: number;
    heightPx: number;
  };
  shellMode: UiShellLayoutMode;
  inputBlocked: boolean;
  gapPx: number;
  measuredVerticalChromePx: number | null;
  calculatorInstances: CalculatorInstanceLayoutConfig[];
  activeCalculatorId: string;
  workbench: WorkbenchViewportModel;
};

export type KeypadGeometrySnapshot = {
  columns: number;
  rows: number;
  keyHeightPx: number;
  keyMinWidthPx: number;
  gapPx: number;
  baselineKeypadHeightPx: number;
  shouldStretchKeypadHeight: boolean;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  heightPx: number | null;
};

export type CalculatorBodySnapshot = {
  widthPx: number;
  minHeightPx: number;
  baselineWidthPx: number;
  baselineMinHeightPx: number;
};

export type VisualizerSnapshot = {
  widthPx: number;
};

export type LayoutInvariants = {
  keypadBodyHorizontalInsetPx: number;
  keypadBodyVerticalInsetPx: number;
};

export type CalculatorLayoutSnapshot = {
  id: string;
  shellMode: UiShellLayoutMode;
  inputBlocked: boolean;
  body: CalculatorBodySnapshot;
  keypad: KeypadGeometrySnapshot;
  visualizer: VisualizerSnapshot;
  invariants: LayoutInvariants;
};

export type LayoutSnapshot = {
  workbench: WorkbenchViewportModel;
  calculators: CalculatorLayoutSnapshot[];
  activeCalculatorId: string;
};

export type MotionSpecTokens = {
  keypadGrowMaxDurationMs: number;
  calcGrowMaxDurationMs: number;
  modeTransitionDurationMs: number;
};

export type MotionIntentKind =
  | "none"
  | "keypad_grow_row"
  | "keypad_grow_col"
  | "keypad_grow_both";

export type MotionIntent = {
  kind: MotionIntentKind;
  forCalculatorId: string;
  keypadGrowDirection: "" | "row" | "column" | "both";
};
