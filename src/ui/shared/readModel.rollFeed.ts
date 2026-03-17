import { toPreferredFractionString } from "../../infra/math/euclideanEngine.js";
import { calculatorValueToDisplayString } from "../../domain/calculatorValue.js";
import { getSeedRow, getStepRows } from "../../domain/rollEntries.js";
import type {
  CalculatorValue,
  RollEntry,
} from "../../domain/types.js";

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
  rText?: string;
  hasRemainder: boolean;
  hasError: boolean;
};

export type FeedTableViewModel = {
  rows: FeedTableRow[];
  showRColumn: boolean;
  xWidth: number;
  yWidth: number;
  rWidth: number;
};

const FEED_MAX_VISIBLE_ROWS = 7;
const FEED_FIXED_COLUMN_WIDTH = 5;
const FEED_Y_COLUMN_PADDING_CHARS = 3;
const FEED_R_COLUMN_PADDING_CHARS = 3;
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
    rows.push({
      x: 0,
      yText: calculatorValueToFeedText(seedRow.y),
      hasRemainder: false,
      hasError: false,
    });
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const hasError = Boolean(entry.error);
    const hasRemainder = Boolean(entry.remainder) && !hasError;
    rows.push({
      x: index + 1,
      yText: calculatorValueToFeedText(entry.y),
      ...(hasRemainder ? { rText: toPreferredFractionString(entry.remainder!) } : {}),
      hasRemainder,
      hasError,
    });
  }
  return rows;
};

export const buildFeedTableViewModel = (
  rollEntries: RollEntry[],
  unlockedTotalDigits: number = 1,
): FeedTableViewModel => {
  const rows = buildFeedTableRows(rollEntries);
  const visibleRows = rows.slice(-FEED_MAX_VISIBLE_ROWS);
  const showRColumn = visibleRows.some((row) => row.hasRemainder);
  const unlockedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const yWidth = unlockedDigits + FEED_Y_COLUMN_PADDING_CHARS;
  const rWidth = Math.ceil(unlockedDigits / 2) + FEED_R_COLUMN_PADDING_CHARS;
  return {
    rows: visibleRows,
    showRColumn,
    xWidth: FEED_FIXED_COLUMN_WIDTH,
    yWidth,
    rWidth,
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
