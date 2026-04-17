import { calculatorValueEquals } from "../../../domain/rollEntries.js";
import { HISTORY_FLAG } from "../../../domain/state.js";
import { computeOverflowBoundary, exceedsMagnitudeBoundary } from "../../../domain/calculatorValue.js";
import { executeSlotsValue } from "../../../domain/engine.js";
import type { ExecutionErrorKind, GameState, RationalValue, ScalarValue } from "../../../domain/types.js";
import { applyUxRoleAttributes } from "../../shared/readModel.js";

type SegmentName = "a" | "b" | "c" | "d" | "e" | "f" | "g";
type RatioSlotModel = {
  state: "unlocked" | "active";
  activeSegments: readonly SegmentName[];
};
const MAX_RATIO_SLOT_COUNT = 12;

const SEGMENT_NAMES: readonly SegmentName[] = ["a", "b", "c", "d", "e", "f", "g"];
const TOKEN_SEGMENTS: Record<string, readonly SegmentName[]> = {
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
  E: ["a", "d", "e", "f", "g"],
  r: ["e", "g"],
  o: ["c", "d", "e", "g"],
};
const NAN_ERROR_TOKEN = "Error";
const NAN_ERROR_KINDS: ReadonlySet<ExecutionErrorKind> = new Set([
  "division_by_zero",
  "nan_input",
  "symbolic_result",
  "ambiguous",
]);

const resolveScalarRational = (value: ScalarValue): { num: bigint; den: bigint } | null =>
  value.kind === "rational" ? value.value : null;

const resolveCycleAmberActive = (state: GameState): boolean => {
  if (!state.ui.buttonFlags[HISTORY_FLAG]) {
    return false;
  }
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle"
    ? state.calculator.rollAnalysis.cycle
    : null;
  if (!cycle) {
    return false;
  }
  const latestIndex = state.calculator.rollEntries.length - 1;
  if (latestIndex < 0 || latestIndex < cycle.j) {
    return false;
  }
  const latestEntry = state.calculator.rollEntries[latestIndex];
  const cycleStartEntry = state.calculator.rollEntries[cycle.i];
  if (!latestEntry || !cycleStartEntry) {
    return false;
  }
  return calculatorValueEquals(latestEntry.y, cycleStartEntry.y);
};

type RatioDisplayValues = { reNum: string; reDen: string; imNum: string; imDen: string };
type RationalPair = { re: RationalValue; im: RationalValue };
type ComponentLimitKind = "none" | "overflow" | "overflow_q";

const countRadixDigits = (value: bigint, radix: number): number => {
  const safeRadix = Math.max(2, Math.trunc(radix));
  const normalized = value < 0n ? -value : value;
  return normalized.toString(safeRadix).length;
};

const getDisplayRadix = (state: GameState): 2 | 10 => (state.settings.base === "base2" ? 2 : 10);

const resolveRationalPair = (total: GameState["calculator"]["total"]): RationalPair | null => {
  if (total.kind === "rational") {
    return { re: total.value, im: { num: 0n, den: 1n } };
  }
  if (total.kind === "complex") {
    const re = resolveScalarRational(total.value.re);
    const im = resolveScalarRational(total.value.im);
    return { re: re ?? { num: 0n, den: 1n }, im: im ?? { num: 0n, den: 1n } };
  }
  return null;
};

const toRatioDisplayValues = (pair: RationalPair): RatioDisplayValues => ({
  reNum: pair.re.num.toString(),
  reDen: pair.re.den.toString(),
  imNum: pair.im.num.toString(),
  imDen: pair.im.den.toString(),
});

const resolveCurrentRatioDisplayValues = (state: GameState): RatioDisplayValues => {
  const pair = resolveRationalPair(state.calculator.total);
  if (pair) {
    return toRatioDisplayValues(pair);
  }
  return {
    reNum: "0",
    reDen: "1",
    imNum: "0",
    imDen: "1",
  };
};

const resolveRawPairBeforeLatestClamp = (state: GameState): RationalPair | null => {
  const latestIndex = state.calculator.rollEntries.length - 1;
  if (latestIndex <= 0) {
    return null;
  }
  if (state.calculator.operationSlots.length === 0) {
    return null;
  }
  const previous = state.calculator.rollEntries[latestIndex - 1];
  if (!previous) {
    return null;
  }
  const execution = executeSlotsValue(previous.y, state.calculator.operationSlots, { currentRollNumber: BigInt(latestIndex) });
  if (!execution.ok) {
    return null;
  }
  return resolveRationalPair(execution.total);
};

const classifyComponentLimitKind = (
  raw: RationalValue,
  clamped: RationalValue,
  state: GameState,
): ComponentLimitKind => {
  if (raw.num === clamped.num && raw.den === clamped.den) {
    return "none";
  }
  const radix = getDisplayRadix(state);
  const boundary = computeOverflowBoundary(state.unlocks.maxTotalDigits, radix);
  if (exceedsMagnitudeBoundary(raw, boundary)) {
    return "overflow";
  }
  const maxDenominatorDigits = Math.max(0, Math.trunc(state.lambdaControl.delta_q));
  if (maxDenominatorDigits <= 0 || countRadixDigits(raw.den, radix) > maxDenominatorDigits) {
    return "overflow_q";
  }
  return "none";
};

const mergeRawAndClampedByErrorKind = (
  raw: RationalPair,
  clamped: RationalPair,
  state: GameState,
): RationalPair => {
  const mergeComponent = (rawValue: RationalValue, clampedValue: RationalValue): RationalValue => {
    const limitKind = classifyComponentLimitKind(rawValue, clampedValue, state);
    if (limitKind === "overflow") {
      return { num: clampedValue.num, den: rawValue.den };
    }
    if (limitKind === "overflow_q") {
      return { num: rawValue.num, den: clampedValue.den };
    }
    return clampedValue;
  };
  return {
    re: mergeComponent(raw.re, clamped.re),
    im: mergeComponent(raw.im, clamped.im),
  };
};

const resolveErrorAwareRatioDisplayValues = (state: GameState): RatioDisplayValues => {
  const latestError = state.calculator.rollEntries.at(-1)?.error;
  if (state.calculator.total.kind === "nan" || (latestError && NAN_ERROR_KINDS.has(latestError.kind))) {
    return {
      reNum: NAN_ERROR_TOKEN,
      reDen: NAN_ERROR_TOKEN,
      imNum: NAN_ERROR_TOKEN,
      imDen: NAN_ERROR_TOKEN,
    };
  }
  const clampedPair = resolveRationalPair(state.calculator.total);
  if (!latestError || !clampedPair) {
    return resolveCurrentRatioDisplayValues(state);
  }
  if (latestError.kind !== "overflow" && latestError.kind !== "overflow_q") {
    return toRatioDisplayValues(clampedPair);
  }
  const rawPair = resolveRawPairBeforeLatestClamp(state);
  if (!rawPair) {
    return toRatioDisplayValues(clampedPair);
  }
  return toRatioDisplayValues(mergeRawAndClampedByErrorKind(rawPair, clampedPair, state));
};

const buildTokenSlotModel = (token: string, slotCount: number): RatioSlotModel[] => {
  const clampedSlots = Math.max(1, Math.min(MAX_RATIO_SLOT_COUNT, Math.trunc(slotCount)));
  const glyphs = Array.from(token).filter((glyph) => glyph in TOKEN_SEGMENTS).slice(-clampedSlots);
  const leadingUnlockedCount = clampedSlots - glyphs.length;
  const out: RatioSlotModel[] = [];
  for (let index = 0; index < clampedSlots; index += 1) {
    if (index < leadingUnlockedCount) {
      out.push({ state: "unlocked", activeSegments: [] });
      continue;
    }
    const glyph = glyphs[index - leadingUnlockedCount] ?? "";
    out.push({ state: "active", activeSegments: TOKEN_SEGMENTS[glyph] ?? [] });
  }
  return out;
};

const appendSevenSegmentFrame = (target: HTMLElement, slotModels: readonly RatioSlotModel[]): void => {
  const frame = document.createElement("div");
  frame.className = "seg-frame";
  frame.style.gridTemplateColumns = `repeat(${slotModels.length.toString()}, max-content)`;

  for (const slot of slotModels) {
    const digit = document.createElement("div");
    digit.className = `seg-digit seg-digit--${slot.state}`;
    for (const segmentName of SEGMENT_NAMES) {
      const segment = document.createElement("div");
      segment.className = `seg seg-${segmentName}`;
      if (slot.state === "active" && slot.activeSegments.includes(segmentName)) {
        segment.classList.add("seg--on");
      }
      digit.appendChild(segment);
    }
    frame.appendChild(digit);
  }

  target.appendChild(frame);
};

const appendRatioDisplay = (row: HTMLElement, token: string, slotCount: number): void => {
  const display = document.createElement("div");
  display.className = "v2-ratios-display";
  display.setAttribute("data-ratios-token", token);
  display.setAttribute(
    "data-ratios-slot-count",
    Math.max(1, Math.min(MAX_RATIO_SLOT_COUNT, Math.trunc(slotCount))).toString(),
  );
  appendSevenSegmentFrame(display, buildTokenSlotModel(token, slotCount));
  row.appendChild(display);
};

const appendSeparator = (row: HTMLElement): void => {
  const separator = document.createElement("span");
  separator.className = "v2-ratios-separator";
  separator.textContent = ":";
  row.appendChild(separator);
};

const renderRatiosRow = (
  table: HTMLElement,
  options: {
    className: "v2-ratios-row--imaginary" | "v2-ratios-row--real";
    leftToken: string;
    rightToken: string;
    leftSlotCount: number;
    rightSlotCount: number;
    uxRole: "imaginary" | "default";
  },
): void => {
  const row = document.createElement("div");
  row.className = `v2-ratios-row ${options.className}`;
  applyUxRoleAttributes(row, { uxRole: options.uxRole, uxState: "active" });
  appendRatioDisplay(row, options.leftToken, options.leftSlotCount);
  appendSeparator(row);
  appendRatioDisplay(row, options.rightToken, options.rightSlotCount);
  table.appendChild(row);
};

export const clearRatiosVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.classList.remove("v2-ratios-panel--cycle");
  panel.classList.remove("v2-ratios-panel--error");
  panel.setAttribute("aria-hidden", "true");
};

export const renderRatiosVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");
  const values = resolveErrorAwareRatioDisplayValues(state);
  panel.classList.toggle("v2-ratios-panel--cycle", resolveCycleAmberActive(state));
  panel.classList.toggle(
    "v2-ratios-panel--error",
    values.reNum === NAN_ERROR_TOKEN
      || values.reDen === NAN_ERROR_TOKEN
      || values.imNum === NAN_ERROR_TOKEN
      || values.imDen === NAN_ERROR_TOKEN,
  );
  const numeratorSlotCount = Math.max(3, Math.min(MAX_RATIO_SLOT_COUNT, Math.trunc(state.unlocks.maxTotalDigits)));
  const denominatorSlotCount = Math.max(1, Math.min(MAX_RATIO_SLOT_COUNT, Math.trunc(state.lambdaControl.delta_q)));
  if (typeof document === "undefined") {
    panel.textContent = `Im ${values.imNum}:${values.imDen}\nRe ${values.reNum}:${values.reDen}`;
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-ratios-table";
  renderRatiosRow(table, {
    className: "v2-ratios-row--imaginary",
    leftToken: values.imNum,
    rightToken: values.imDen,
    leftSlotCount: numeratorSlotCount,
    rightSlotCount: denominatorSlotCount,
    uxRole: "imaginary",
  });
  renderRatiosRow(table, {
    className: "v2-ratios-row--real",
    leftToken: values.reNum,
    rightToken: values.reDen,
    leftSlotCount: numeratorSlotCount,
    rightSlotCount: denominatorSlotCount,
    uxRole: "default",
  });
  panel.appendChild(table);
};
