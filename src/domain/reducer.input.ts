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
import {
  CHECKLIST_UNLOCK_ID,
  OVERFLOW_ERROR_SEEN_ID,
} from "./state.js";
import { isDigitKey, isOperatorKey } from "./buttonRegistry.js";
import { resolveKeyActionHandlerId, type KeyActionHandlerId } from "./keyActionHandlers.js";
import type { Digit, ErrorCode, ExecKey, ExecutionErrorKind, GameState, Key, RationalValue, RollEntry, SlotOperator } from "./types.js";
import { applyUnlocks } from "./unlocks.js";
import { applyMemoryAdjust, cycleMemoryVariable, isMemoryKey, resolveMemoryRecallDigit } from "./memoryController.js";

// PRESS_KEY behavior and key-flow preprocessing/dispatch.
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
  state.calculator.rollEntries.length === 0 &&
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
  if (!state.unlocks.valueAtoms[digit] && !state.unlocks.valueExpression[digit]) {
    return state;
  }
  return applyDigitValue(state, digit);
};

const applyDigitValue = (state: GameState, digit: Digit): GameState => {
  if (state.calculator.rollEntries.length > 0) {
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
  if (!state.unlocks.valueCompose.NEG && !state.unlocks.valueExpression.NEG) {
    return state;
  }

  if (state.calculator.rollEntries.length > 0) {
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
  errorCode?: ErrorCode;
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

const toRollEntry = (evaluation: EvaluatedExecution): RollEntry => ({
  y: evaluation.nextTotal,
  ...(evaluation.euclidRemainder && !evaluation.errorCode ? { remainder: evaluation.euclidRemainder } : {}),
  ...(evaluation.errorCode && evaluation.errorKind
    ? {
      error: {
        code: evaluation.errorCode,
        kind: evaluation.errorKind,
      },
    }
    : {}),
});

const applyEquals = (state: GameState): GameState => {
  if (!state.unlocks.execution["="]) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const shouldCaptureSeed = finalized.calculator.rollEntries.length === 0 && finalized.calculator.seedSnapshot === undefined;
  const evaluation = evaluateExecutionOutcome(finalized, "=");
  const nextEntry = toRollEntry(evaluation);

  const withRoll: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: evaluation.nextTotal,
      ...(shouldCaptureSeed ? { seedSnapshot: finalized.calculator.total } : {}),
      pendingNegativeTotal: false,
      rollEntries: [...finalized.calculator.rollEntries, nextEntry],
    },
  };

  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, unlockCatalog);
};

const applyIncrement = (state: GameState): GameState => {
  if (!state.unlocks.execution["++"]) {
    return state;
  }

  const shouldCaptureSeed = state.calculator.rollEntries.length === 0 && state.calculator.seedSnapshot === undefined;
  const evaluation = evaluateExecutionOutcome(state, "++");
  const nextEntry = toRollEntry(evaluation);

  const withIncrementedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: evaluation.nextTotal,
      ...(shouldCaptureSeed ? { seedSnapshot: state.calculator.total } : {}),
      pendingNegativeTotal: false,
      rollEntries: [...state.calculator.rollEntries, nextEntry],
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

  const shouldCaptureSeed = state.calculator.rollEntries.length === 0 && state.calculator.seedSnapshot === undefined;
  const evaluation = evaluateExecutionOutcome(state, "--");
  const nextEntry = toRollEntry(evaluation);

  const withDecrementedTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: evaluation.nextTotal,
      ...(shouldCaptureSeed ? { seedSnapshot: state.calculator.total } : {}),
      pendingNegativeTotal: false,
      rollEntries: [...state.calculator.rollEntries, nextEntry],
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

const applyBackspace = (state: GameState): GameState => {
  if (!state.unlocks.utilities["\u2190"]) {
    return state;
  }
  if (state.calculator.rollEntries.length > 0) {
    return state;
  }

  const slotToDrafting = (slot: { operator: SlotOperator; operand: bigint }) => ({
    operator: slot.operator,
    operandInput: (slot.operand < 0n ? -slot.operand : slot.operand).toString(),
    isNegative: slot.operand < 0n && slot.operand !== 0n,
  });

  const drafting = state.calculator.draftingSlot;
  if (drafting) {
    if (drafting.operandInput.length > 0) {
      const nextInput = drafting.operandInput.slice(0, -1);
      if (nextInput === drafting.operandInput) {
        return state;
      }
      return applyUnlocks(
        withBuilderPatchApplied(state, {
          operationSlots: state.calculator.operationSlots,
          draftingSlot: {
            ...drafting,
            operandInput: nextInput,
          },
        }),
        unlockCatalog,
      );
    }
    if (drafting.isNegative && drafting.operandInput.length === 0) {
      return applyUnlocks(
        withBuilderPatchApplied(state, {
          operationSlots: state.calculator.operationSlots,
          draftingSlot: {
            ...drafting,
            isNegative: false,
          },
        }),
        unlockCatalog,
      );
    }

    if (state.calculator.operationSlots.length > 0) {
      const priorCommitted = state.calculator.operationSlots[state.calculator.operationSlots.length - 1];
      return applyUnlocks(
        withBuilderPatchApplied(state, {
          operationSlots: state.calculator.operationSlots.slice(0, -1),
          draftingSlot: slotToDrafting(priorCommitted),
        }),
        unlockCatalog,
      );
    }

    return applyUnlocks(
      withBuilderPatchApplied(state, {
        operationSlots: state.calculator.operationSlots,
        draftingSlot: null,
      }),
      unlockCatalog,
    );
  }

  if (state.calculator.operationSlots.length > 0) {
    const lastCommitted = state.calculator.operationSlots[state.calculator.operationSlots.length - 1];
    const restoredDrafting = slotToDrafting(lastCommitted);
    const trimmedInput = restoredDrafting.operandInput.slice(0, -1);
    return applyUnlocks(
      withBuilderPatchApplied(state, {
        operationSlots: state.calculator.operationSlots.slice(0, -1),
        draftingSlot: {
          ...restoredDrafting,
          operandInput: trimmedInput,
        },
      }),
      unlockCatalog,
    );
  }

  if (!isSeedEntryContext(state) || !isRationalCalculatorValue(state.calculator.total) || !isInteger(state.calculator.total.value)) {
    return state;
  }
  const value = state.calculator.total.value;
  const magnitudeText = value.num < 0n ? (-value.num).toString() : value.num.toString();
  const nextMagnitudeText = magnitudeText.length <= 1 ? "0" : magnitudeText.slice(0, -1);
  const nextMagnitude = BigInt(nextMagnitudeText);
  const shouldBeNegative = value.num < 0n;
  const nextNum = nextMagnitude === 0n ? 0n : shouldBeNegative ? -nextMagnitude : nextMagnitude;
  if (nextNum === value.num) {
    return state;
  }

  return applyUnlocks(
    {
      ...state,
      calculator: {
        ...state.calculator,
        total: toRationalCalculatorValue({ num: nextNum, den: 1n }),
      },
    },
    unlockCatalog,
  );
};

const applyUndo = (state: GameState): GameState => {
  if (!state.unlocks.utilities.UNDO) {
    return state;
  }

  if (state.calculator.rollEntries.length === 0) {
    return state;
  }

  const nextRollEntries = state.calculator.rollEntries.slice(0, -1);
  const nextTotal = nextRollEntries[nextRollEntries.length - 1]?.y ?? createResetCalculatorState().total;
  return {
    ...state,
    calculator: {
      ...state.calculator,
      total: nextTotal,
      rollEntries: nextRollEntries,
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: nextRollEntries.length === 0,
    },
  };
};

const isDigit = (key: Key): key is Digit => isDigitKey(key);
const isOperator = (key: Key): key is SlotOperator => isOperatorKey(key);

const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.rollEntries.length === 0 || !isOperator(key)) {
    return state;
  }

  if (!state.unlocks.slotOperators[key]) {
    return state;
  }
  return clearOperationEntry(state);
};

const applyMemoryKeyAction = (state: GameState, key: Key): GameState => {
  if (!isMemoryKey(key) || !isKeyUnlocked(state, key)) {
    return state;
  }
  if (key === "α,β,γ") {
    return cycleMemoryVariable(state);
  }
  if (key === "M→") {
    return applyDigitValue(state, resolveMemoryRecallDigit(state));
  }
  if (key === "M+") {
    return applyMemoryAdjust(state, 1);
  }
  if (key === "M–") {
    return applyMemoryAdjust(state, -1);
  }
  return state;
};

export const applyKeyAction = (state: GameState, key: Key): GameState => {
  // Input precedence:
  // 1) active-roll digit keys are hard no-op
  // 2) active-roll operator keys clear current operation entry before handling
  // 3) normal key dispatch
  if (state.calculator.rollEntries.length > 0 && isDigit(key)) {
    return state;
  }

  const preprocessed = preprocessForActiveRoll(state, key);
  const keyed = isKeyUnlocked(preprocessed, key) ? incrementKeyPressCount(preprocessed, key) : preprocessed;

  const handlers: Record<KeyActionHandlerId, (nextState: GameState, currentKey: Key) => GameState> = {
    apply_digit: (nextState, currentKey) => (isDigit(currentKey) ? applyDigit(nextState, currentKey) : nextState),
    apply_operator: (nextState, currentKey) => (isOperator(currentKey) ? applyOperator(nextState, currentKey) : nextState),
    apply_execute: (nextState) => nextState,
    apply_utility: (nextState) => nextState,
    apply_visualizer_noop: (nextState) => nextState,
    apply_toggle_noop: (nextState) => nextState,
    apply_noop: (nextState) => nextState,
    apply_memory: (nextState, currentKey) => applyMemoryKeyAction(nextState, currentKey),
    apply_negate: (nextState) => applyNegate(nextState),
    apply_clear_all: (nextState) => applyC(nextState),
    apply_clear_entry: (nextState) => applyCE(nextState),
    apply_backspace: (nextState) => applyBackspace(nextState),
    apply_undo: (nextState) => applyUnlocks(applyUndo(nextState), unlockCatalog),
    apply_equals: (nextState) => applyEquals(nextState),
    apply_increment: (nextState) => applyIncrement(nextState),
    apply_decrement: (nextState) => applyDecrement(nextState),
  };

  const handlerId = resolveKeyActionHandlerId(key);
  return handlers[handlerId](keyed, key);
};
