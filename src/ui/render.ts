import { unlockCatalog } from "../content/unlocks.catalog.js";
import { CHECKLIST_UNLOCK_ID } from "../domain/state.js";
import type { Action, GameState, Key, Slot, UnlockDefinition, UnlockEffect, UnlockPredicate } from "../domain/types.js";

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

let previousChecklistUnlocked: boolean | null = null;

export type UnlockRowState = "not_completed" | "completed" | "impossible";

export type UnlockCriterionVm = {
  label: string;
  checked: boolean;
};

export type UnlockRowVm = {
  id: string;
  name: string;
  state: UnlockRowState;
  criteria: UnlockCriterionVm[];
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

export const buildOperationSlotDisplay = (state: GameState): string => {
  const visibleSlots = state.unlocks.maxSlots;
  if (visibleSlots <= 0) {
    return "(no operation slots)";
  }

  const filledTokens = state.calculator.operationSlots.map((slot) => `[ ${slot.operator} ${slot.operand.toString()} ]`);
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput || "_";
    filledTokens.push(`[ ${state.calculator.draftingSlot.operator} ${operand} ]`);
  }

  const tokens = filledTokens.slice(0, visibleSlots);
  while (tokens.length < visibleSlots) {
    tokens.push("[ _ _ ]");
  }

  return tokens.join(" -> ");
};

const getUnlockName = (effect: UnlockEffect): string => {
  if (effect.type === "unlock_digit") {
    return effect.key;
  }
  if (effect.type === "unlock_slot_operator") {
    return effect.key;
  }
  if (effect.type === "unlock_execution") {
    return effect.key;
  }
  if (effect.type === "unlock_utility") {
    return effect.key;
  }
  if (effect.type === "increase_max_total_digits") {
    return "maxTotalDigits";
  }
  return "unknown";
};

const getOperationSnapshot = (state: GameState): Slot[] => {
  const slots = [...state.calculator.operationSlots];
  const drafting = state.calculator.draftingSlot;
  if (!drafting || drafting.operandInput.length === 0) {
    return slots;
  }
  slots.push({
    operator: drafting.operator,
    operand: BigInt(drafting.operandInput),
  });
  return slots;
};

const getProgressiveRollSequenceMatches = (roll: bigint[], required: bigint[]): number => {
  const maxCandidate = Math.min(roll.length, required.length);
  for (let candidate = maxCandidate; candidate >= 0; candidate -= 1) {
    const rollSuffix = roll.slice(roll.length - candidate);
    const requiredPrefix = required.slice(0, candidate);
    const isMatch = rollSuffix.every((value, index) => value === requiredPrefix[index]);
    if (isMatch) {
      return candidate;
    }
  }
  return 0;
};

const buildCriteriaForPredicate = (predicate: UnlockPredicate, state: GameState): UnlockCriterionVm[] => {
  if (predicate.type === "total_equals") {
    return [{ label: predicate.value.toString(), checked: state.calculator.total === predicate.value }];
  }

  if (predicate.type === "total_at_least") {
    return [{ label: predicate.value.toString(), checked: state.calculator.total >= predicate.value }];
  }

  if (predicate.type === "total_at_most") {
    return [{ label: predicate.value.toString(), checked: state.calculator.total <= predicate.value }];
  }

  if (predicate.type === "roll_ends_with_sequence") {
    const matchedCount = getProgressiveRollSequenceMatches(state.calculator.roll, predicate.sequence);
    return predicate.sequence.map((value, index) => ({
      label: value.toString(),
      checked: index < matchedCount,
    }));
  }

  if (predicate.type === "operation_equals") {
    const requiredTokens = predicate.slots.flatMap((slot) => [slot.operator, slot.operand.toString()]);
    const currentSlots = getOperationSnapshot(state);
    const currentTokens = currentSlots.flatMap((slot) => [slot.operator, slot.operand.toString()]);
    return requiredTokens.map((token, index) => ({
      label: token,
      checked: currentTokens[index] === token,
    }));
  }

  if (predicate.type === "roll_length_at_least") {
    return [
      {
        label: `len >= ${predicate.length.toString()}`,
        checked: state.calculator.roll.length >= predicate.length,
      },
    ];
  }

  return [];
};

const isUnlockImpossible = (_unlock: UnlockDefinition, _state: GameState): boolean => false;

export const buildUnlockRows = (
  state: GameState,
  catalog: UnlockDefinition[],
  impossibleCheck: (unlock: UnlockDefinition, state: GameState) => boolean = isUnlockImpossible,
): UnlockRowVm[] => {
  const rows = catalog.map<UnlockRowVm>((unlock) => {
    const completed = state.completedUnlockIds.includes(unlock.id);
    const impossible = impossibleCheck(unlock, state);
    const rowState: UnlockRowState = impossible ? "impossible" : completed ? "completed" : "not_completed";
    const criteria = buildCriteriaForPredicate(unlock.predicate, state);
    return {
      id: unlock.id,
      name: getUnlockName(unlock.effect),
      state: rowState,
      criteria: completed ? criteria.map((criterion) => ({ ...criterion, checked: true })) : criteria,
    };
  });

  const visible = rows.filter((row) => row.state !== "impossible");
  const pending = visible.filter((row) => row.state === "not_completed");
  const completed = visible.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};

export const isChecklistUnlocked = (state: GameState): boolean =>
  state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID);

const renderUnlockChecklist = (unlockEl: Element, state: GameState): void => {
  const checklistUnlocked = isChecklistUnlocked(state);
  const shouldAnimateOpen = previousChecklistUnlocked === false && checklistUnlocked;
  previousChecklistUnlocked = checklistUnlocked;

  unlockEl.setAttribute("data-checklist-state", checklistUnlocked ? "open" : "locked");
  unlockEl.setAttribute("data-checklist-animate", shouldAnimateOpen ? "true" : "false");

  if (!checklistUnlocked) {
    unlockEl.innerHTML = "";
    unlockEl.setAttribute("aria-hidden", "true");
    return;
  }

  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = "Unlocks";
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const nameHeader = document.createElement("span");
  nameHeader.textContent = "Name |";
  const criteriaHeader = document.createElement("span");
  criteriaHeader.textContent = "Criteria";
  header.append(nameHeader, criteriaHeader);
  unlockEl.appendChild(header);

  const rows = buildUnlockRows(state, unlockCatalog);
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "unlock-row";
    if (row.state === "completed") {
      rowEl.classList.add("unlock-row--completed");
    }

    const nameEl = document.createElement("span");
    nameEl.className = "unlock-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);

    const criteriaEl = document.createElement("span");
    criteriaEl.className = "unlock-criteria";
    for (const criterion of row.criteria) {
      const criterionEl = document.createElement("span");
      criterionEl.className = "unlock-criterion";
      criterionEl.textContent = `[${criterion.checked ? "x" : " "}] ${criterion.label}`;
      criteriaEl.appendChild(criterionEl);
    }
    rowEl.appendChild(criteriaEl);

    unlockEl.appendChild(rowEl);
  }
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
  if (key === "+" || key === "-") {
    return state.unlocks.slotOperators[key];
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
  slotEl.textContent = buildOperationSlotDisplay(state);

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

  renderUnlockChecklist(unlockEl, state);

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
