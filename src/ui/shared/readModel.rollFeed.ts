import {
  calculatorValueToDisplayString,
  calculatorValuesEquivalent,
  isScalarValueZero,
  scalarValueToCalculatorValue,
} from "../../domain/calculatorValue.js";
import { getSeedRow, getStepRows } from "../../domain/rollEntries.js";
import type {
  CalculatorValue,
  GameState,
  RollEntry,
} from "../../domain/types.js";
import { resolveHistoryForecastValueForState } from "../modules/visualizers/numberLineModel.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";

export type RollRow = {
  prefix: string;
  value: string;
  errorCode?: string;
};

export type RollViewModel = {
  rows: RollRow[];
  isVisible: boolean;
  lineCount: number;
  valueColumnChars: number;
};

export type FeedTableRow = {
  rowKind: "committed" | "forecast_history" | "forecast_step";
  x: number | null;
  xLabel: string;
  yText: string;
  zText?: string;
  hasImaginary: boolean;
  hasError: boolean;
  isCycle: boolean;
  uxRole: UxRole;
  uxState: UxRoleState;
  uxRoleOverride?: UxRole;
  overrideReason?: string;
};

export type FeedTableViewModel = {
  rows: FeedTableRow[];
  showZColumn: boolean;
  xWidth: number;
  yWidth: number;
  zWidth: number;
};

const FEED_MAX_VISIBLE_ROWS = 12;
const FEED_FIXED_COLUMN_WIDTH = 5;
const FEED_Y_COLUMN_PADDING_CHARS = 3;
const FEED_Z_COLUMN_PADDING_CHARS = 3;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;

export const buildRollLines = (rollEntries: RollEntry[]): string[] =>
  rollEntries.map((entry) => calculatorValueToDisplayString(entry.y));

const calculatorValueToFeedText = (value: CalculatorValue): string =>
  calculatorValueToDisplayString(value);

const buildFeedTableRowFromValue = (
  value: CalculatorValue,
  options: {
    rowKind: FeedTableRow["rowKind"];
    x: number | null;
    xLabel: string;
    hasError: boolean;
    isCycle: boolean;
    uxRole: UxRole;
    uxState: UxRoleState;
  },
): FeedTableRow => {
  if (value.kind === "complex") {
    return {
      rowKind: options.rowKind,
      x: options.x,
      xLabel: options.xLabel,
      yText: calculatorValueToFeedText(scalarValueToCalculatorValue(value.value.re)),
      zText: calculatorValueToFeedText(scalarValueToCalculatorValue(value.value.im)),
      hasImaginary: !isScalarValueZero(value.value.im),
      hasError: options.hasError,
      isCycle: options.isCycle,
      uxRole: options.uxRole,
      uxState: options.uxState,
    };
  }
  return {
    rowKind: options.rowKind,
    x: options.x,
    xLabel: options.xLabel,
    yText: calculatorValueToFeedText(value),
    hasImaginary: false,
    hasError: options.hasError,
    isCycle: options.isCycle,
    uxRole: options.uxRole,
    uxState: options.uxState,
  };
};

export const buildFeedTableRows = (
  rollEntries: RollEntry[],
): FeedTableRow[] => {
  const rows: FeedTableRow[] = [];
  const seedRow = getSeedRow(rollEntries);
  if (seedRow) {
    rows.push(buildFeedTableRowFromValue(seedRow.y, {
      rowKind: "committed",
      x: 0,
      xLabel: "0",
      hasError: false,
      isCycle: false,
      uxRole: "default",
      uxState: "normal",
    }));
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const hasError = Boolean(entry.error);
    rows.push(buildFeedTableRowFromValue(entry.y, {
      rowKind: "committed",
      x: index + 1,
      xLabel: (index + 1).toString(),
      hasError,
      isCycle: false,
      uxRole: hasError ? "error" : "default",
      uxState: hasError ? "active" : "normal",
    }));
  }
  return rows;
};

export const resolveFeedRowUxAssignment = (row: FeedTableRow): UxRoleAssignment => ({
  uxRole: row.uxRole,
  uxState: row.uxState,
  ...(row.uxRoleOverride ? { uxRoleOverride: row.uxRoleOverride } : {}),
  ...(row.overrideReason ? { overrideReason: row.overrideReason } : {}),
});

export const buildFeedTableViewModel = (
  rollEntries: RollEntry[],
  unlockedTotalDigits: number = 1,
): FeedTableViewModel => {
  const rows = buildFeedTableRows(rollEntries);
  const visibleRows = rows.slice(-FEED_MAX_VISIBLE_ROWS);
  const showZColumn = rows.some((row) => row.hasImaginary);
  const unlockedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const yWidth = unlockedDigits + FEED_Y_COLUMN_PADDING_CHARS;
  const zWidth = unlockedDigits + FEED_Z_COLUMN_PADDING_CHARS;
  return {
    rows: visibleRows,
    showZColumn,
    xWidth: FEED_FIXED_COLUMN_WIDTH,
    yWidth,
    zWidth,
  };
};

const resolveCommittedRowsWithCycleStyling = (
  state: GameState,
  committedRows: FeedTableRow[],
): FeedTableRow[] => {
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  const rollEntries = state.calculator.rollEntries;
  const cycleStartEntry = cycle ? rollEntries[cycle.i] : null;
  if (state.settings.cycle !== "on" || !cycle || !cycleStartEntry) {
    return committedRows;
  }
  return committedRows.map((row) => {
    if (row.rowKind !== "committed" || row.x === null || row.hasError) {
      return row;
    }
    if (row.x < cycle.j) {
      return row;
    }
    const rowEntry = rollEntries[row.x];
    if (!rowEntry) {
      return row;
    }
    if (!calculatorValuesEquivalent(rowEntry.y, cycleStartEntry.y)) {
      return row;
    }
    return {
      ...row,
      isCycle: true,
      uxRole: "analysis",
      uxState: "active",
    };
  });
};

const buildForecastRowsForState = (state: GameState, nextIndexBase: number): FeedTableRow[] => {
  const rows: FeedTableRow[] = [];
  const nextIndex = nextIndexBase;
  const historyForecast = resolveHistoryForecastValueForState(state);
  if (historyForecast) {
    rows.push(buildFeedTableRowFromValue(historyForecast, {
      rowKind: "forecast_history",
      x: null,
      xLabel: `~${nextIndex.toString()}`,
      hasError: false,
      isCycle: false,
      uxRole: "unlock",
      uxState: "muted",
    }));
  }
  return rows;
};

export const buildFeedTableViewModelForState = (
  state: GameState,
): FeedTableViewModel => {
  const committedRows = buildFeedTableRows(state.calculator.rollEntries);
  const committedRowsWithCycleStyling = resolveCommittedRowsWithCycleStyling(state, committedRows);
  const visibleCommittedRows = committedRowsWithCycleStyling.slice(-FEED_MAX_VISIBLE_ROWS);
  const forecastRows = buildForecastRowsForState(state, committedRowsWithCycleStyling.length);
  const rows = [...visibleCommittedRows, ...forecastRows];
  const showZColumn = rows.some((row) => row.hasImaginary);
  const unlockedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(state.unlocks.maxTotalDigits)));
  const yWidth = unlockedDigits + FEED_Y_COLUMN_PADDING_CHARS;
  const zWidth = unlockedDigits + FEED_Z_COLUMN_PADDING_CHARS;
  return {
    rows,
    showZColumn,
    xWidth: FEED_FIXED_COLUMN_WIDTH,
    yWidth,
    zWidth,
  };
};

export const buildRollRows = (
  rollEntries: RollEntry[],
): RollRow[] => {
  const rollLines = buildRollLines(rollEntries);
  const rows: RollRow[] = [];
  let previousVisibleErrorCode: string | undefined;
  for (let index = 0; index < rollEntries.length; index += 1) {
    const entry = rollEntries[index];
    const errorCode = entry.error?.code;
    if (errorCode && errorCode === previousVisibleErrorCode) {
      continue;
    }
    rows.push({
      prefix: rows.length === 0 ? "X =" : "  =",
      value: errorCode ? "" : rollLines[index],
      errorCode,
    });
    previousVisibleErrorCode = errorCode;
  }
  return rows;
};

export const buildRollViewModel = (
  rollEntries: RollEntry[],
): RollViewModel => {
  const rows = buildRollRows(rollEntries);
  const valueColumnChars = rows.reduce((max, row) => {
    const suffixLength = row.errorCode ? `Err: ${row.errorCode}`.length : 0;
    return Math.max(max, row.value.length, suffixLength);
  }, 0);
  return {
    rows,
    isVisible: rows.length > 0,
    lineCount: rows.length,
    valueColumnChars,
  };
};
