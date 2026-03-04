import type { GameState } from "../domain/types.js";

export type StepBodyHighlightRegion = {
  topIndex: number;
  bottomIndex: number;
};

export type StepBodyHighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const buildStepBodyHighlightRegions = (state: GameState): StepBodyHighlightRegion[] => {
  const regions: StepBodyHighlightRegion[] = [];
  const columns = Math.max(1, state.ui.keypadColumns || 1);
  for (let index = 0; index < state.ui.keyLayout.length; index += 1) {
    const cell = state.ui.keyLayout[index];
    if (cell.kind !== "key" || cell.key !== "\u23EF") {
      continue;
    }
    const belowIndex = index + columns;
    regions.push({
      topIndex: index,
      bottomIndex: belowIndex < state.ui.keyLayout.length ? belowIndex : index,
    });
  }
  return regions;
};

export const resolveStepBodyHighlightRects = (
  keysEl: Element,
  regions: StepBodyHighlightRegion[],
): StepBodyHighlightRect[] => {
  const keysRect = keysEl.getBoundingClientRect();
  let halfColumnGap = 0;
  let halfRowGap = 0;
  if (keysEl instanceof HTMLElement && typeof window !== "undefined") {
    const computed = window.getComputedStyle(keysEl);
    const rawColumnGap = computed.columnGap || computed.gap || "0";
    const parsedColumnGap = Number.parseFloat(rawColumnGap);
    if (Number.isFinite(parsedColumnGap) && parsedColumnGap > 0) {
      halfColumnGap = parsedColumnGap / 2;
    }
    const rawRowGap = computed.rowGap || computed.gap || "0";
    const parsedRowGap = Number.parseFloat(rawRowGap);
    if (Number.isFinite(parsedRowGap) && parsedRowGap > 0) {
      halfRowGap = parsedRowGap / 2;
    }
  }
  const rects: StepBodyHighlightRect[] = [];
  for (const region of regions) {
    const topSlot = keysEl.querySelector<HTMLElement>(
      `[data-layout-surface="keypad"][data-layout-index="${region.topIndex.toString()}"]`,
    );
    const bottomSlot = keysEl.querySelector<HTMLElement>(
      `[data-layout-surface="keypad"][data-layout-index="${region.bottomIndex.toString()}"]`,
    );
    if (!topSlot || !bottomSlot) {
      continue;
    }
    const topRect = topSlot.getBoundingClientRect();
    const bottomRect = bottomSlot.getBoundingClientRect();
    const left = Math.max(0, topRect.left - keysRect.left - halfColumnGap);
    const right = Math.min(keysRect.width, topRect.right - keysRect.left + halfColumnGap);
    const top = Math.max(0, Math.min(topRect.top, bottomRect.top) - keysRect.top - halfRowGap);
    const bottom = Math.min(keysRect.height, Math.max(topRect.bottom, bottomRect.bottom) - keysRect.top + halfRowGap);
    rects.push({
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    });
  }
  return rects;
};
