import { unlockCatalog } from "../../content/unlocks.catalog.js";
import { toPreferredFractionString } from "../../infra/math/euclideanEngine.js";
import { analyzeUnlockSpecRows } from "../../domain/analysis.js";
import { buildUnlockCriteria } from "../../domain/unlockEngine.js";
import type {
  CalculatorValue,
  EuclidRemainderEntry,
  GameState,
  Key,
  RollErrorEntry,
  SlotOperator,
  UnlockDefinition,
  UnlockEffect,
} from "../../domain/types.js";

export type KeyVisualGroup = "value_expression" | "slot_operator" | "utility" | "visualizers" | "execution";

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

export const formatOperatorForDisplay = (operator: SlotOperator): string =>
  operator === "*" ? "\u00D7" : operator === "/" ? "\u00F7" : operator;

export const formatOperatorForOperationSlotDisplay = (operator: SlotOperator): string =>
  operator === "\u27E1" ? "\u2662" : formatOperatorForDisplay(operator);

export const formatKeyLabel = (key: Key): string => {
  if (key === "NEG") {
    return "-\u{1D465}";
  }
  if (key === "UNDO") {
    return "\u21BA";
  }
  if (key === "\u23EF") {
    return "\u25BA";
  }
  if (key === "#") {
    return "#/\u27E1";
  }
  if (key === "\u27E1") {
    return "\u27E1";
  }
  if (key === "++") {
    return "+ +";
  }
  if (key === "--") {
    return "\u2212 \u2212";
  }
  if (key === "*" || key === "/") {
    return formatOperatorForDisplay(key);
  }
  return key;
};

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  if (/^\d$/.test(key) || key === "NEG") {
    return "value_expression";
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return "slot_operator";
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "\u23EF") {
    return "utility";
  }
  if (key === "GRAPH" || key === "FEED") {
    return "visualizers";
  }
  return "execution";
};

export const buildOperationSlotDisplay = (state: GameState): string => {
  const visibleSlots = state.unlocks.maxSlots;
  if (visibleSlots <= 0) {
    return "(no operation slots)";
  }

  const filledTokens = state.calculator.operationSlots.map(
    (slot) => `[ ${formatOperatorForOperationSlotDisplay(slot.operator)} ${slot.operand.toString()} ]`,
  );
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput
      ? `${state.calculator.draftingSlot.isNegative ? "-" : ""}${state.calculator.draftingSlot.operandInput}`
      : state.calculator.draftingSlot.isNegative
        ? "-_"
        : "_";
    filledTokens.push(`[ ${formatOperatorForOperationSlotDisplay(state.calculator.draftingSlot.operator)} ${operand} ]`);
  }

  const tokens = filledTokens.slice(0, visibleSlots);
  while (tokens.length < visibleSlots) {
    tokens.push("[ _ _ ]");
  }

  return tokens.join(" -> ");
};

export const buildRollLines = (roll: CalculatorValue[]): string[] =>
  roll.map((value) => (value.kind === "rational" ? toPreferredFractionString(value.value) : "NaN"));

export const buildRollRows = (
  rollLines: string[],
  euclidRemainders: EuclidRemainderEntry[] = [],
  rollErrors: RollErrorEntry[] = [],
): RollRow[] => {
  const remainderByRollIndex = new Map<number, string>();
  for (const remainder of euclidRemainders) {
    remainderByRollIndex.set(remainder.rollIndex, toPreferredFractionString(remainder.value));
  }
  const errorByRollIndex = new Map<number, string>();
  for (const error of rollErrors) {
    errorByRollIndex.set(error.rollIndex, error.code);
  }
  const seenErrorCodes = new Set<string>();
  const rows: RollRow[] = [];
  for (let index = 0; index < rollLines.length; index += 1) {
    const errorCode = errorByRollIndex.get(index);
    if (errorCode && seenErrorCodes.has(errorCode)) {
      continue;
    }
    if (errorCode) {
      seenErrorCodes.add(errorCode);
    }
    rows.push({
      prefix: rows.length === 0 ? "X =" : "  =",
      value: errorCode ? "" : rollLines[index],
      remainder: errorCode ? undefined : remainderByRollIndex.get(index),
      errorCode,
    });
  }
  return rows;
};

export const buildRollViewModel = (
  roll: CalculatorValue[],
  euclidRemainders: EuclidRemainderEntry[] = [],
  rollErrors: RollErrorEntry[] = [],
): RollViewModel => {
  const rows = buildRollRows(buildRollLines(roll), euclidRemainders, rollErrors);
  const valueColumnChars = rows.reduce((max, row) => {
    const suffixLength = row.errorCode
      ? `Err: ${row.errorCode}`.length
      : row.remainder
        ? `\u27E1= ${row.remainder}`.length
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

const getUnlockName = (effect: UnlockEffect): string => {
  if (effect.type === "unlock_digit") {
    return effect.key;
  }
  if (effect.type === "unlock_slot_operator") {
    return formatOperatorForDisplay(effect.key);
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
  if (effect.type === "increase_allocator_max_points") {
    return "maxPoints";
  }
  if (effect.type === "unlock_storage_drawer") {
    return "storage";
  }
  if (effect.type === "upgrade_keypad_column") {
    return "keypadCols";
  }
  if (effect.type === "upgrade_keypad_row") {
    return "keypadRows";
  }
  if (effect.type === "move_key_to_coord") {
    return `${formatKeyLabel(effect.key)}->R${effect.row.toString()}C${effect.col.toString()}`;
  }
  return "unknown";
};

const isUnlockImpossible = (_unlock: UnlockDefinition, _state: GameState): boolean => false;
const isReachableOrUnknownStatus = (status: "satisfied" | "possible" | "blocked" | "unknown" | "todo"): boolean =>
  status === "satisfied" || status === "possible" || status === "unknown" || status === "todo";

export const buildUnlockRows = (
  state: GameState,
  catalog: UnlockDefinition[] = unlockCatalog,
  impossibleCheck: (unlock: UnlockDefinition, state: GameState) => boolean = isUnlockImpossible,
): UnlockRowVm[] => {
  const specRowsById = new Map(analyzeUnlockSpecRows(state, { useAllUnlockedKeys: false }, catalog).map((row) => [row.unlockId, row]));
  const rows = catalog.map((unlock) => {
    const completed = state.completedUnlockIds.includes(unlock.id);
    const impossible = impossibleCheck(unlock, state);
    const specRow = specRowsById.get(unlock.id);
    const specVisible = completed || !specRow || isReachableOrUnknownStatus(specRow.status);
    const rowState: UnlockRowState = impossible || !specVisible ? "impossible" : completed ? "completed" : "not_completed";
    const criteria = buildUnlockCriteria(unlock.predicate, state);
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
