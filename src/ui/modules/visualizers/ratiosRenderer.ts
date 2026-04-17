import type { GameState, ScalarValue } from "../../../domain/types.js";
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
};

const resolveScalarRational = (value: ScalarValue): { num: bigint; den: bigint } | null =>
  value.kind === "rational" ? value.value : null;

const resolveRatioValues = (state: GameState): { reNum: string; reDen: string; imNum: string; imDen: string } => {
  const total = state.calculator.total;
  if (total.kind === "rational") {
    return {
      reNum: total.value.num.toString(),
      reDen: total.value.den.toString(),
      imNum: "0",
      imDen: "1",
    };
  }
  if (total.kind === "complex") {
    const re = resolveScalarRational(total.value.re);
    const im = resolveScalarRational(total.value.im);
    return {
      reNum: (re?.num ?? 0n).toString(),
      reDen: (re?.den ?? 1n).toString(),
      imNum: (im?.num ?? 0n).toString(),
      imDen: (im?.den ?? 1n).toString(),
    };
  }
  return {
    reNum: "0",
    reDen: "1",
    imNum: "0",
    imDen: "1",
  };
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
  panel.setAttribute("aria-hidden", "true");
};

export const renderRatiosVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const values = resolveRatioValues(state);
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
