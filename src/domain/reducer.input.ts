import { unlockCatalog } from "../content/unlocks.catalog.js";
import { addInt, isInteger } from "../infra/math/rationalEngine.js";
import {
  clampRationalToBoundary,
  computeOverflowBoundary,
  DIVISION_BY_ZERO_ERROR_CODE,
  exceedsMagnitudeBoundary,
  isRationalCalculatorValue,
  NAN_INPUT_ERROR_CODE,
  OVERFLOW_ERROR_CODE,
  toNanCalculatorValue,
  toRationalCalculatorValue,
} from "./calculatorValue.js";
import { executeSlots } from "./engine.js";
import {
  applyDigitInput,
  applyNegateInput,
  applyOperatorInput,
  finalizeDrafting,
  fromCalculator,
  toCalculatorPatch,
} from "./functionBuilder.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import { clearOperationEntry, createResetCalculatorState } from "./reducer.stateBuilders.js";
import { CHECKLIST_UNLOCK_ID, OVERFLOW_ERROR_SEEN_ID } from "./state.js";
import type { Digit, ExecKey, ExecutionErrorKind, GameState, Key, RationalValue, SlotOperator } from "./types.js";
import { applyUnlocks } from "./unlocks.js";

// PRESS_KEY behavior and key-flow preprocessing/dispatch.
const DIGITS: Digit[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const incrementKeyPressCount = (state: GameState, key: Key): GameState => ({
  ...state,
  keyPressCounts: {
    ...state.keyPressCounts,
    [key]: (state.keyPressCounts[key] ?? 0) + 1,
  },
});

const withDigit = (source: string, digit: Digit): string => {
  if (source === "0") {
    return digit;
  }
  return `${source}${digit}`;
};

const getMagnitudeText = (total: GameState["calculator"]["total"]): string => {
  if (!isRationalCalculatorValue(total) || !isInteger(total.value)) {
    return "0";
  }
  return total.value.num < 0n ? (-total.value.num).toString() : total.value.num.toString();
};

const isSeedEntryContext = (state: GameState): boolean =>
  state.calculator.roll.length === 0 &&
  state.calculator.rollErrors.length === 0 &&
  state.calculator.euclidRemainders.length === 0 &&
  state.calculator.operationSlots.length === 0 &&
  state.calculator.draftingSlot === null;

const getNextTotalMagnitudeInput = (state: GameState, digit: Digit): string => {
  const currentTotalMagnitudeInput = getMagnitudeText(state.calculator.total);
  return isSeedEntryContext(state)
    ? digit
    : withDigit(currentTotalMagnitudeInput, digit);
};

const withBuilderPatchApplied = (
  state: GameState,
  patch: Pick<GameState["calculator"], "operationSlots" | "draftingSlot">,
): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    operationSlots: patch.operationSlots,
    draftingSlot: patch.draftingSlot,
  },
});

const applyOperator = (state: GameState, operator: SlotOperator): GameState => {
  if (!state.unlocks.slotOperators[operator]) {
    return state;
  }

  const builder = fromCalculator(state.calculator);
  const nextBuilder = applyOperatorInput(builder, operator, {
    maxSlots: state.unlocks.maxSlots,
    maxOperandDigits: 1,
  });
  const nextPatch = toCalculatorPatch(nextBuilder);
  if (
    nextPatch.operationSlots === state.calculator.operationSlots
    && nextPatch.draftingSlot === state.calculator.draftingSlot
  ) {
    return state;
  }

  return applyUnlocks(withBuilderPatchApplied(state, nextPatch), unlockCatalog);
};

const applyDigit = (state: GameState, digit: Digit): GameState => {
  if (!state.unlocks.valueExpression[digit]) {
    return state;
  }

  const builder = fromCalculator(state.calculator);
  const nextBuilder = applyDigitInput(builder, digit, {
    maxSlots: state.unlocks.maxSlots,
    maxOperandDigits: 1,
  });
  const nextPatch = toCalculatorPatch(nextBuilder);
  if (
    nextPatch.operationSlots !== state.calculator.operationSlots
    || nextPatch.draftingSlot !== state.calculator.draftingSlot
  ) {
    return applyUnlocks(withBuilderPatchApplied(state, nextPatch), unlockCatalog);
  }

  const nextTotalMagnitudeInput = getNextTotalMagnitudeInput(state, digit);
  if (nextTotalMagnitudeInput.length > state.unlocks.maxTotalDigits) {
    return state;
  }

  const nextMagnitude = BigInt(nextTotalMagnitudeInput);
  const shouldBeNegative =
    (isRationalCalculatorValue(state.calculator.total) && state.calculator.total.value.num < 0n) ||
    state.calculator.pendingNegativeTotal;
  const nextTotalBigInt = nextMagnitude === 0n ? 0n : shouldBeNegative ? -nextMagnitude : nextMagnitude;

  const withNextTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: toRationalCalculatorValue({ num: nextTotalBigInt, den: 1n }),
      pendingNegativeTotal: nextMagnitude === 0n ? state.calculator.pendingNegativeTotal : false,
      singleDigitInitialTotalEntry: false,
    },
  };

  return applyUnlocks(withNextTotal, unlockCatalog);
};

const applyNegate = (state: GameState): GameState => {
  if (!state.unlocks.valueExpression.NEG) {
    return state;
  }

  if (state.calculator.roll.length > 0) {
    return state;
  }

  const builder = fromCalculator(state.calculator);
  const nextBuilder = applyNegateInput(builder);
  const nextPatch = toCalculatorPatch(nextBuilder);
  if (
    nextPatch.operationSlots !== state.calculator.operationSlots
    || nextPatch.draftingSlot !== state.calculator.draftingSlot
  ) {
    return applyUnlocks(withBuilderPatchApplied(state, nextPatch), unlockCatalog);
  }

  if (!isRationalCalculatorValue(state.calculator.total)) {
    return state;
  }

  if (state.calculator.total.value.num === 0n) {
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
      total: toRationalCalculatorValue({
        ...state.calculator.total.value,
        num: -state.calculator.total.value.num,
      }),
      pendingNegativeTotal: false,
    },
  };
  return applyUnlocks(withNegatedTotal, unlockCatalog);
};

const finalizeDraftingSlot = (state: GameState): GameState => {
  const builder = fromCalculator(state.calculator);
  const finalizedBuilder = finalizeDrafting(builder);
  const finalizedPatch = toCalculatorPatch(finalizedBuilder);
  if (
    finalizedPatch.operationSlots === state.calculator.operationSlots
    && finalizedPatch.draftingSlot === state.calculator.draftingSlot
  ) {
    return state;
  }
  return {
    ...state,
    calculator: {
      ...state.calculator,
      ...finalizedPatch,
    },
  };
};

type EvaluatedExecution = {
  nextTotal: GameState["calculator"]["total"];
  euclidRemainder?: RationalValue;
  errorCode?: GameState["calculator"]["rollErrors"][number]["code"];
  errorKind?: ExecutionErrorKind;
};

const applyOverflowPolicy = (value: RationalValue, maxDigits: number): EvaluatedExecution => {
  const boundary = computeOverflowBoundary(maxDigits);
  if (!exceedsMagnitudeBoundary(value, boundary)) {
    return { nextTotal: toRationalCalculatorValue(value) };
  }
  return {
    nextTotal: toRationalCalculatorValue(clampRationalToBoundary(value, boundary)),
    errorCode: OVERFLOW_ERROR_CODE,
    errorKind: "overflow",
  };
};

const markOverflowErrorSeen = (state: GameState): GameState => {
  if (state.completedUnlockIds.includes(OVERFLOW_ERROR_SEEN_ID)) {
    return state;
  }
  return {
    ...state,
    completedUnlockIds: [...state.completedUnlockIds, OVERFLOW_ERROR_SEEN_ID],
  };
};

const evaluateExecutionOutcome = (state: GameState, execKey: ExecKey): EvaluatedExecution => {
  const currentTotal = state.calculator.total;
  if (!isRationalCalculatorValue(currentTotal)) {
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode: NAN_INPUT_ERROR_CODE,
      errorKind: "nan_input",
    };
  }

  if (execKey === "++") {
    const incremented = addInt(currentTotal.value, 1n);
    return applyOverflowPolicy(incremented, state.unlocks.maxTotalDigits);
  }
  if (execKey === "--") {
    const decremented = addInt(currentTotal.value, -1n);
    return applyOverflowPolicy(decremented, state.unlocks.maxTotalDigits);
  }

  const execution = executeSlots(currentTotal.value, state.calculator.operationSlots);
  if (!execution.ok) {
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode: DIVISION_BY_ZERO_ERROR_CODE,
      errorKind: "division_by_zero",
    };
  }

  const overflowChecked = applyOverflowPolicy(execution.total, state.unlocks.maxTotalDigits);
  return {
    ...overflowChecked,
    euclidRemainder: execution.euclidRemainder,
  };
};

const applyEquals = (state: GameState): GameState => {
  if (!state.unlocks.execution["="]) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const startingTotal = finalized.calculator.total;
  const { operationSlots, roll } = finalized.calculator;
  const rollWasEmpty = roll.length === 0;
  const hasOperations = operationSlots.length > 0;

  const evaluation = evaluateExecutionOutcome(finalized, "=");
  const appendedRoll = rollWasEmpty && hasOperations ? [startingTotal, evaluation.nextTotal] : [evaluation.nextTotal];
  const appendedRollIndex = roll.length + appendedRoll.length - 1;
  const nextRemainders = [...finalized.calculator.euclidRemainders];
  if (evaluation.euclidRemainder && !evaluation.errorCode) {
    nextRemainders.push({
      rollIndex: appendedRollIndex,
      value: evaluation.euclidRemainder,
    });
  }
  const nextRollErrors = [...finalized.calculator.rollErrors];
  if (evaluation.errorCode && evaluation.errorKind) {
    nextRollErrors.push({
      rollIndex: appendedRollIndex,
      code: evaluation.errorCode,
      kind: evaluation.errorKind,
    });
  }

  const withRoll: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      roll: [...roll, ...appendedRoll],
      rollErrors: nextRollErrors,
      euclidRemainders: nextRemainders,
    },
  };

  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, unlockCatalog);
};

const applyIncrement = (state: GameState): GameState => {
  if (!state.unlocks.execution["++"]) {
    return state;
  }

  const evaluation = evaluateExecutionOutcome(state, "++");
  const appendedRollIndex = state.calculator.roll.length;
  const nextRollErrors = [...state.calculator.rollErrors];
  if (evaluation.errorCode && evaluation.errorKind) {
    nextRollErrors.push({
      rollIndex: appendedRollIndex,
      code: evaluation.errorCode,
      kind: evaluation.errorKind,
    });
  }

  const withIncrementedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      roll: [...state.calculator.roll, evaluation.nextTotal],
      rollErrors: nextRollErrors,
    },
  };

  const withOverflowMarker =
    evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withIncrementedTotal) : withIncrementedTotal;
  return applyUnlocks(withOverflowMarker, unlockCatalog);
};

const applyDecrement = (state: GameState): GameState => {
  if (!state.unlocks.execution["--"]) {
    return state;
  }

  const evaluation = evaluateExecutionOutcome(state, "--");
  const appendedRollIndex = state.calculator.roll.length;
  const nextRollErrors = [...state.calculator.rollErrors];
  if (evaluation.errorCode && evaluation.errorKind) {
    nextRollErrors.push({
      rollIndex: appendedRollIndex,
      code: evaluation.errorCode,
      kind: evaluation.errorKind,
    });
  }

  const withDecrementedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      roll: [...state.calculator.roll, evaluation.nextTotal],
      rollErrors: nextRollErrors,
    },
  };

  const withOverflowMarker =
    evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withDecrementedTotal) : withDecrementedTotal;
  return applyUnlocks(withOverflowMarker, unlockCatalog);
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

const applyUndo = (state: GameState): GameState => {
  if (!state.unlocks.utilities.UNDO) {
    return state;
  }

  const rollLength = state.calculator.roll.length;
  if (rollLength >= 2) {
    const previousTotal = state.calculator.roll[rollLength - 2];
    const nextRoll = [...state.calculator.roll, previousTotal];
    return {
      ...state,
      calculator: {
        ...state.calculator,
        total: previousTotal,
        roll: nextRoll,
        pendingNegativeTotal: false,
      },
    };
  }
  return state;
};

const isDigit = (key: Key): key is Digit => DIGITS.includes(key as Digit);
const isOperator = (key: Key): key is SlotOperator =>
  key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1";

const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.roll.length === 0 || !isOperator(key)) {
    return state;
  }

  if (!state.unlocks.slotOperators[key]) {
    return state;
  }
  return clearOperationEntry(state);
};

export const applyKeyAction = (state: GameState, key: Key): GameState => {
  // Input precedence:
  // 1) active-roll digit keys are hard no-op
  // 2) active-roll operator keys clear current operation entry before handling
  // 3) normal key dispatch
  if (state.calculator.roll.length > 0 && isDigit(key)) {
    return state;
  }

  const preprocessed = preprocessForActiveRoll(state, key);
  const keyed = isKeyUnlocked(preprocessed, key) ? incrementKeyPressCount(preprocessed, key) : preprocessed;

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
  if (key === "--") {
    return applyDecrement(keyed);
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
