import type { Action, GameState, Key } from "../domain/types.js";

const MAX_UNLOCKED_TOTAL_DIGITS = 12;
const SEGMENT_NAMES = ["a", "b", "c", "d", "e", "f", "g"] as const;
type SegmentName = (typeof SEGMENT_NAMES)[number];

type TotalSlotModel = {
  state: "locked" | "unlocked" | "active";
  digit: string | null;
  activeSegments: readonly SegmentName[];
};

type RollRow = {
  prefix: string;
  value: string;
};

type RollViewModel = {
  rows: RollRow[];
  isVisible: boolean;
  lineCount: number;
  valueColumnChars: number;
};

const DIGIT_SEGMENTS: Record<string, readonly SegmentName[]> = {
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
};

const clampUnlockedDigits = (value: number): number =>
  Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, value));

export const buildTotalSlotModel = (total: bigint, unlockedDigits: number): TotalSlotModel[] => {
  const clampedUnlocked = clampUnlockedDigits(unlockedDigits);
  const lockedCount = MAX_UNLOCKED_TOTAL_DIGITS - clampedUnlocked;
  const renderedDigits = total.toString().slice(-clampedUnlocked);
  const leadingUnlockedCount = clampedUnlocked - renderedDigits.length;
  const slots: TotalSlotModel[] = [];

  for (let index = 0; index < MAX_UNLOCKED_TOTAL_DIGITS; index += 1) {
    if (index < lockedCount) {
      slots.push({
        state: "locked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const unlockedIndex = index - lockedCount;
    if (unlockedIndex < leadingUnlockedCount) {
      slots.push({
        state: "unlocked",
        digit: null,
        activeSegments: [],
      });
      continue;
    }

    const digit = renderedDigits[unlockedIndex - leadingUnlockedCount];
    slots.push({
      state: "active",
      digit,
      activeSegments: DIGIT_SEGMENTS[digit] ?? [],
    });
  }

  return slots;
};

export const buildRollLines = (roll: bigint[]): string[] => {
  return roll.map((value) => value.toString());
};

export const buildRollRows = (rollLines: string[]): RollRow[] => {
  return rollLines.map((value, index) => ({
    prefix: index === 0 ? "X =" : "  =",
    value,
  }));
};

export const buildRollViewModel = (roll: bigint[]): RollViewModel => {
  const lines = buildRollLines(roll);
  const rows = buildRollRows(lines);
  const valueColumnChars = lines.reduce((max, value) => Math.max(max, value.length), 0);
  return {
    rows,
    isVisible: rows.length > 0,
    lineCount: rows.length,
    valueColumnChars,
  };
};

const renderTotalDisplay = (totalEl: Element, state: GameState): void => {
  const slotModels = buildTotalSlotModel(state.calculator.total, state.unlocks.maxTotalDigits);
  totalEl.innerHTML = "";

  const frame = document.createElement("div");
  frame.className = "seg-frame";

  for (const slot of slotModels) {
    const digitEl = document.createElement("div");
    digitEl.className = `seg-digit seg-digit--${slot.state}`;

    for (const segmentName of SEGMENT_NAMES) {
      const segmentEl = document.createElement("div");
      segmentEl.className = `seg seg-${segmentName}`;
      if (slot.state === "active" && slot.activeSegments.includes(segmentName)) {
        segmentEl.classList.add("seg--on");
      }
      digitEl.appendChild(segmentEl);
    }

    frame.appendChild(digitEl);
  }

  totalEl.setAttribute("aria-label", `Total ${state.calculator.total.toString()}`);
  totalEl.appendChild(frame);
};

const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  if (/^\d$/.test(key)) {
    return state.unlocks.digits[key as keyof GameState["unlocks"]["digits"]];
  }
  if (key === "+") {
    return state.unlocks.slotOperators["+"];
  }
  if (key === "C" || key === "CE") {
    return state.unlocks.utilities[key];
  }
  if (key === "=") {
    return state.unlocks.execution["="];
  }
  return false;
};

export const render = (root: Element, state: GameState, dispatch: (action: Action) => unknown): void => {
  const totalEl = root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl) {
    throw new Error("UI mount points are missing.");
  }

  renderTotalDisplay(totalEl, state);

  const committed = state.calculator.operationSlots.map((slot) => `[ ${slot.operator} ${slot.operand.toString()} ]`);
  const draft = state.calculator.draftingSlot
    ? `[ ${state.calculator.draftingSlot.operator} ${state.calculator.draftingSlot.operandInput || "_"} ]`
    : null;
  slotEl.textContent = [...committed, draft].filter(Boolean).join(" -> ") || "(no operation slots)";

  const rollView = buildRollViewModel(state.calculator.roll);
  rollEl.innerHTML = "";
  rollEl.setAttribute("data-roll-visible", rollView.isVisible ? "true" : "false");
  rollEl.setAttribute("aria-hidden", rollView.isVisible ? "false" : "true");
  rollEl.setAttribute("aria-label", rollView.isVisible ? "Calculator roll" : "Calculator roll hidden");
  if (rollEl instanceof HTMLElement) {
    rollEl.style.setProperty("--roll-line-count", rollView.lineCount.toString());
  }
  for (const row of rollView.rows) {
    const line = document.createElement("div");
    line.className = "roll-line";

    const prefix = document.createElement("span");
    prefix.className = "roll-prefix";
    prefix.textContent = row.prefix;
    line.appendChild(prefix);

    const value = document.createElement("span");
    value.className = "roll-value";
    value.textContent = row.value;
    line.appendChild(value);

    rollEl.appendChild(line);
  }

  const keyCells = state.ui.keyLayout.filter((cell) => cell.kind === "key");
  const unlockedCount = keyCells.filter((cell) => isKeyUnlocked(state, cell.key)).length;
  unlockEl.textContent = `Unlocked keys: ${unlockedCount}/${keyCells.length}`;

  keysEl.innerHTML = "";
  for (const cell of state.ui.keyLayout) {
    if (cell.kind === "placeholder") {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      keysEl.appendChild(placeholder);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    if (cell.wide) {
      button.classList.add("key--wide");
    }
    if (cell.tall) {
      button.classList.add("key--tall");
    }
    button.textContent = cell.key;
    button.disabled = !isKeyUnlocked(state, cell.key);
    button.addEventListener("click", () => {
      dispatch({ type: "PRESS_KEY", key: cell.key });
    });
    keysEl.appendChild(button);
  }
};
