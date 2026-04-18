import {
  calculatorValueToRational,
  isRationalCalculatorValue,
  isRealEquivalentCalculatorValue,
} from "../../domain/calculatorValue.js";
import type { CalculatorValue, GameState } from "../../domain/types.js";

export const MAX_SEVEN_SEGMENT_SLOTS = 12;
export const NAN_ERROR_TOKEN = "Error";
export const FRACTION_TOKEN = "FrAC";
export const IRRATIONAL_TOKEN = "rAdicAL";

export type ScalarDisplayKind = "integer" | "fraction" | "irrational" | "nan";

export const SEVEN_SEGMENT_TOKEN_SEGMENTS: Record<string, readonly ("a" | "b" | "c" | "d" | "e" | "f" | "g")[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "d", "e", "g"],
  "3": ["a", "b", "c", "d", "g"],
  "4": ["b", "c", "f", "g"],
  "5": ["a", "c", "d", "f", "g"],
  "6": ["a", "c", "d", "e", "f", "g"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
  "-": ["g"],
  "=": ["d", "g"],
  E: ["a", "d", "e", "f", "g"],
  r: ["e", "g"],
  F: ["a", "e", "f", "g"],
  A: ["a", "b", "c", "e", "f", "g"],
  C: ["a", "d", "e", "f"],
  I: ["b", "c"],
  R: ["e", "g"],
  d: ["b", "c", "d", "e", "g"],
  o: ["c", "d", "e", "g"],
  i: ["c"],
  c: ["d", "e", "g"],
  L: ["d", "e", "f"],
};

export const clampSevenSegmentSlotCount = (value: number, maxSlots: number = MAX_SEVEN_SEGMENT_SLOTS): number =>
  Math.max(1, Math.min(maxSlots, Math.trunc(value)));

export const buildTokenGlyphSlots = (
  token: string,
  slotCount: number,
  maxSlots: number = MAX_SEVEN_SEGMENT_SLOTS,
): Array<string | null> => {
  const clampedSlots = clampSevenSegmentSlotCount(slotCount, maxSlots);
  const glyphs = Array.from(token).slice(0, clampedSlots);
  const leadingEmptyCount = clampedSlots - glyphs.length;
  const out: Array<string | null> = [];
  for (let index = 0; index < leadingEmptyCount; index += 1) {
    out.push(null);
  }
  out.push(...glyphs);
  return out;
};

export const resolveScalarDisplayKind = (value: CalculatorValue): ScalarDisplayKind => {
  if (value.kind === "nan") {
    return "nan";
  }
  const rationalValue = isRationalCalculatorValue(value) ? value.value : calculatorValueToRational(value);
  if (!rationalValue) {
    return "irrational";
  }
  if (rationalValue.den !== 1n) {
    return "fraction";
  }
  return "integer";
};

export const resolveDisplayToken = (kind: ScalarDisplayKind): string | null => {
  if (kind === "nan") {
    return NAN_ERROR_TOKEN;
  }
  if (kind === "fraction") {
    return FRACTION_TOKEN;
  }
  if (kind === "irrational") {
    return IRRATIONAL_TOKEN;
  }
  return null;
};

export const hasImaginaryRollHistory = (state: GameState): boolean =>
  state.calculator.rollEntries.some((entry) =>
    entry.y.kind === "complex" && !isRealEquivalentCalculatorValue(entry.y));

