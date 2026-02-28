import { unlockCatalog } from "../content/unlocks.catalog.js";
import { addInt, isInteger } from "../infra/math/rationalEngine.js";
import { executeSlots } from "./engine.js";
import { CHECKLIST_UNLOCK_ID } from "./state.js";
import { applyUnlocks } from "./unlocks.js";
import { getOperationSnapshot, toCommittedDraftingSlot } from "./slotDrafting.js";
import { clearOperationEntry, createResetCalculatorState, resetRunState } from "./reducer.stateBuilders.js";
import type { Digit, GameState, Key, RationalValue, Slot, SlotOperator } from "./types.js";

// PRESS_KEY behavior and key-flow preprocessing/dispatch.
const DIGITS: Digit[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const incrementKeyPressCount = (state: GameState, key: Key): GameState => ({
  ...state,
  keyPressCounts: {
    ...state.keyPressCounts,
    [key]: (state.keyPressCounts[key] ?? 0) + 1,
  },
});

const isKeyUnlockedForInput = (state: GameState, key: Key): boolean => {
  if (DIGITS.includes(key as Digit) || key === "NEG") {
    return state.unlocks.valueExpression[key as keyof GameState["unlocks"]["valueExpression"]];
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return state.unlocks.slotOperators[key];
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "GRAPH") {
    return state.unlocks.utilities[key];
  }
  if (key === "=" || key === "++" || key === "\u23EF") {
    return state.unlocks.execution[key];
  }
  return false;
};

const withDigit = (source: string, digit: Digit): string => {
  if (source === "0") {
    return digit;
  }
  return `${source}${digit}`;
};

const getMagnitudeText = (value: RationalValue): string => {
  if (!isInteger(value)) {
    return "0";
  }
  return value.num < 0n ? (-value.num).toString() : value.num.toString();
};

const isSingleDigitPostClearEntry = (state: GameState): boolean =>
  state.calculator.singleDigitInitialTotalEntry &&
  state.calculator.roll.length === 0 &&
  state.calculator.euclidRemainders.length === 0 &&
  state.calculator.operationSlots.length === 0 &&
  state.calculator.draftingSlot === null;

const applyDigit = (state: GameState, digit: Digit): GameState => {
  if (!state.unlocks.valueExpression[digit]) {
    return state;
  }

  if (state.calculator.draftingSlot) {
    if (state.calculator.draftingSlot.operandInput.length >= 1) {
      return state;
    }

    const draftingSlot = {
      ...state.calculator.draftingSlot,
      operandInput: withDigit(state.calculator.draftingSlot.operandInput, digit),
    };

    const withDraftingSlot: GameState = {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot,
      },
    };

    return applyUnlocks(withDraftingSlot, unlockCatalog);
  }

  const currentTotalMagnitudeInput = getMagnitudeText(state.calculator.total);
  if (isSingleDigitPostClearEntry(state) && currentTotalMagnitudeInput !== "0") {
    return state;
  }

  const nextTotalMagnitudeInput = withDigit(currentTotalMagnitudeInput, digit);
  if (nextTotalMagnitudeInput.length > state.unlocks.maxTotalDigits) {
    return state;
  }

  const nextMagnitude = BigInt(nextTotalMagnitudeInput);
  const shouldBeNegative = state.calculator.total.num < 0n || state.calculator.pendingNegativeTotal;
  const nextTotalBigInt = nextMagnitude === 0n ? 0n : shouldBeNegative ? -nextMagnitude : nextMagnitude;

  const withNextTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: { num: nextTotalBigInt, den: 1n },
      pendingNegativeTotal: nextMagnitude === 0n ? state.calculator.pendingNegativeTotal : false,
    },
  };

  return applyUnlocks(withNextTotal, unlockCatalog);
};

const applyOperator = (state: GameState, operator: SlotOperator): GameState => {
  if (!state.unlocks.slotOperators[operator]) {
    return state;
  }

  const draftingSlot = state.calculator.draftingSlot;
  if (draftingSlot) {
    if (draftingSlot.operandInput === "") {
      return state;
    }

    if (state.calculator.operationSlots.length + 1 >= state.unlocks.maxSlots) {
      return state;
    }

    const committedDraftingSlot = toCommittedDraftingSlot(draftingSlot);
    if (!committedDraftingSlot) {
      return state;
    }

    return applyUnlocks({
      ...state,
      calculator: {
        ...state.calculator,
        operationSlots: [...state.calculator.operationSlots, committedDraftingSlot],
        draftingSlot: {
          operator,
          operandInput: "",
          isNegative: false,
        },
      },
    }, unlockCatalog);
  }

  if (state.calculator.operationSlots.length >= state.unlocks.maxSlots) {
    return state;
  }

  return applyUnlocks({
    ...state,
    calculator: {
      ...state.calculator,
      draftingSlot: {
        operator,
        operandInput: "",
        isNegative: false,
      },
    },
  }, unlockCatalog);
};

const applyNegate = (state: GameState): GameState => {
  if (!state.unlocks.valueExpression.NEG) {
    return state;
  }

  if (state.calculator.roll.length > 0) {
    return state;
  }

  if (state.calculator.draftingSlot) {
    const withDraftingNegated: GameState = {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot: {
          ...state.calculator.draftingSlot,
          isNegative: !state.calculator.draftingSlot.isNegative,
        },
      },
    };
    return applyUnlocks(withDraftingNegated, unlockCatalog);
  }

  if (state.calculator.total.num === 0n) {
    const withPendingZeroSign: GameState = {
      ...state,
      calculator: {
        ...state.calculator,
        pendingNegativeTotal: !state.calculator.pendingNegativeTotal,
      },
    };
    return applyUnlocks(withPendingZeroSign, unlockCatalog);
  }

  const withNegatedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: {
        ...state.calculator.total,
        num: -state.calculator.total.num,
      },
      pendingNegativeTotal: false,
    },
  };
  return applyUnlocks(withNegatedTotal, unlockCatalog);
};

const finalizeDraftingSlot = (state: GameState): GameState => {
  const { draftingSlot } = state.calculator;
  if (!draftingSlot) {
    return state;
  }

  if (draftingSlot.operandInput === "") {
    return {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot: null,
      },
    };
  }

  const committedDraftingSlot = toCommittedDraftingSlot(draftingSlot);
  if (!committedDraftingSlot) {
    return state;
  }

  return {
    ...state,
    calculator: {
      ...state.calculator,
      operationSlots: [...state.calculator.operationSlots, committedDraftingSlot],
      draftingSlot: null,
    },
  };
};

const getExecutionSlots = (state: GameState): Slot[] => getOperationSnapshot(state.calculator);

const applyEquals = (state: GameState): GameState => {
  if (!state.unlocks.execution["="]) {
    return state;
  }

  const executionSlots = getExecutionSlots(state);
  if (
    executionSlots.some(
      (slot) => (slot.operator === "/" || slot.operator === "#" || slot.operator === "⟡") && slot.operand === 0n,
    )
  ) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const startingTotal = finalized.calculator.total;
  const { operationSlots, roll } = finalized.calculator;
  const rollWasEmpty = roll.length === 0;
  const hasOperations = operationSlots.length > 0;
  const execution = executeSlots(startingTotal, operationSlots);
  if (!execution.ok) {
    return state;
  }

  const nextTotal = execution.total;
  const appendedRoll = rollWasEmpty && hasOperations ? [startingTotal, nextTotal] : [nextTotal];
  const nextRemainders = [...finalized.calculator.euclidRemainders];
  if (execution.euclidRemainder) {
    nextRemainders.push({
      rollIndex: roll.length + appendedRoll.length - 1,
      value: execution.euclidRemainder,
    });
  }
  const withRoll: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: nextTotal,
      roll: [...roll, ...appendedRoll],
      euclidRemainders: nextRemainders,
    },
  };

  return applyUnlocks(withRoll, unlockCatalog);
};

const applyIncrement = (state: GameState): GameState => {
  if (!state.unlocks.execution["++"]) {
    return state;
  }

  const withIncrementedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: addInt(state.calculator.total, 1n),
      pendingNegativeTotal: false,
    },
  };

  return applyUnlocks(withIncrementedTotal, unlockCatalog);
};

const applyC = (state: GameState): GameState => {
  if (!state.unlocks.utilities.C) {
    return state;
  }

  const resetState: GameState = { ...state, calculator: createResetCalculatorState() };

  if (resetState.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID)) {
    return resetState;
  }

  return {
    ...resetState,
    completedUnlockIds: [...resetState.completedUnlockIds, CHECKLIST_UNLOCK_ID],
  };
};

const applyCECore = (state: GameState): GameState => clearOperationEntry(state);

const applyCE = (state: GameState): GameState => {
  if (!state.unlocks.utilities.CE) {
    return state;
  }

  return applyCECore(state);
};

const hasActiveOperatorSlot = (state: GameState): boolean =>
  state.calculator.operationSlots.length > 0 || state.calculator.draftingSlot !== null;

const applyUndo = (state: GameState): GameState => {
  if (!state.unlocks.utilities.UNDO) {
    return state;
  }

  const rollLength = state.calculator.roll.length;
  if (rollLength > 0) {
    const removedEntry = state.calculator.roll[rollLength - 1];
    const nextRoll = state.calculator.roll.slice(0, -1);
    const previousTotal = nextRoll.length > 0 ? nextRoll[nextRoll.length - 1] : removedEntry;
    return {
      ...state,
      calculator: {
        ...state.calculator,
        total: previousTotal,
        roll: nextRoll,
        euclidRemainders: state.calculator.euclidRemainders.filter((entry) => entry.rollIndex < nextRoll.length),
      },
    };
  }

  if (hasActiveOperatorSlot(state)) {
    return applyCECore(state);
  }

  const resetState: GameState = { ...state, calculator: createResetCalculatorState() };

  if (resetState.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID)) {
    return resetState;
  }

  return {
    ...resetState,
    completedUnlockIds: [...resetState.completedUnlockIds, CHECKLIST_UNLOCK_ID],
  };
};

const isDigit = (key: Key): key is Digit => DIGITS.includes(key as Digit);
const isOperator = (key: Key): key is SlotOperator =>
  key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "⟡";

const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.roll.length === 0) {
    return state;
  }

  if (isDigit(key)) {
    if (state.calculator.draftingSlot) {
      return state;
    }
    return resetRunState(state);
  }

  if (isOperator(key)) {
    if (!state.unlocks.slotOperators[key]) {
      return state;
    }
    return clearOperationEntry(state);
  }

  return state;
};

export const applyKeyAction = (state: GameState, key: Key): GameState => {
  const preprocessed = preprocessForActiveRoll(state, key);
  const keyed = isKeyUnlockedForInput(preprocessed, key) ? incrementKeyPressCount(preprocessed, key) : preprocessed;

  if (isDigit(key)) {
    return applyDigit(keyed, key);
  }
  if (isOperator(key)) {
    return applyOperator(keyed, key);
  }
  if (key === "=") {
    return applyEquals(keyed);
  }
  if (key === "++") {
    return applyIncrement(keyed);
  }
  if (key === "C") {
    return applyC(keyed);
  }
  if (key === "CE") {
    return applyCE(keyed);
  }
  if (key === "UNDO") {
    return applyUnlocks(applyUndo(keyed), unlockCatalog);
  }
  if (key === "GRAPH") {
    return keyed;
  }
  if (key === "NEG") {
    return applyNegate(keyed);
  }
  return keyed;
};

