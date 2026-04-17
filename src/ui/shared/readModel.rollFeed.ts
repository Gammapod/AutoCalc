import { toPreferredFractionString } from "../../infra/math/euclideanEngine.js";
import { calculatorValueToDisplayString, isScalarValueZero, scalarValueToCalculatorValue } from "../../domain/calculatorValue.js";
import { getSeedRow, getStepRows } from "../../domain/rollEntries.js";
import type {
  CalculatorValue,
  RollEntry,
} from "../../domain/types.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";

export type RollRow = {
  prefix: string;
  value: string;
  remainder?: string;
  errorCode?: string;
};

export type RollViewModel = {
  rows: RollRow[];
  isVisible: boolean;
  lineCount: number;
  valueColumnChars: number;
};

export type FeedTableRow = {
  x: number;
  yText: string;
  zText?: string;
  hasImaginary: boolean;
  hasError: boolean;
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

export const buildFeedTableRows = (
  rollEntries: RollEntry[],
): FeedTableRow[] => {
  const rows: FeedTableRow[] = [];
  const seedRow = getSeedRow(rollEntries);
  if (seedRow) {
    if (seedRow.y.kind === "complex") {
      rows.push({
        x: 0,
        yText: calculatorValueToFeedText(scalarValueToCalculatorValue(seedRow.y.value.re)),
        zText: calculatorValueToFeedText(scalarValueToCalculatorValue(seedRow.y.value.im)),
        hasImaginary: !isScalarValueZero(seedRow.y.value.im),
        hasError: false,
        uxRole: "default",
        uxState: "normal",
      });
    } else {
      rows.push({
        x: 0,
        yText: calculatorValueToFeedText(seedRow.y),
        hasImaginary: false,
        hasError: false,
        uxRole: "default",
        uxState: "normal",
      });
    }
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const hasError = Boolean(entry.error);
    if (entry.y.kind === "complex") {
      rows.push({
        x: index + 1,
        yText: calculatorValueToFeedText(scalarValueToCalculatorValue(entry.y.value.re)),
        zText: calculatorValueToFeedText(scalarValueToCalculatorValue(entry.y.value.im)),
        hasImaginary: !isScalarValueZero(entry.y.value.im),
        hasError,
        uxRole: hasError ? "error" : "default",
        uxState: hasError ? "active" : "normal",
      });
    } else {
      rows.push({
        x: index + 1,
        yText: calculatorValueToFeedText(entry.y),
        hasImaginary: false,
        hasError,
        uxRole: hasError ? "error" : "default",
        uxState: hasError ? "active" : "normal",
      });
    }
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
    const remainder = entry.remainder ? toPreferredFractionString(entry.remainder) : undefined;
    rows.push({
      prefix: rows.length === 0 ? "X =" : "  =",
      value: errorCode ? "" : rollLines[index],
      remainder: errorCode ? undefined : remainder,
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
    const suffixLength = row.errorCode
      ? `Err: ${row.errorCode}`.length
      : row.remainder
        ? `r= ${row.remainder}`.length
        : 0;
    return Math.max(max, row.value.length, suffixLength);
  }, 0);
  return {
    rows,
    isVisible: rows.length > 0,
    lineCount: rows.length,
    valueColumnChars,
  };
};
