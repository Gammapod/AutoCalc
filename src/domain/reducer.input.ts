import { unlockCatalog } from "../content/unlocks.catalog.js";
import { isInteger } from "../infra/math/rationalEngine.js";
import {
  clampRationalToBoundary,
  calculatorValueToDisplayString,
  computeOverflowBoundary,
  DIVISION_BY_ZERO_ERROR_CODE,
  exceedsMagnitudeBoundary,
  isRationalCalculatorValue,
  NAN_INPUT_ERROR_CODE,
  OVERFLOW_ERROR_CODE,
  toExpressionCalculatorValue,
  toNanCalculatorValue,
  toRationalCalculatorValue,
} from "./calculatorValue.js";
import { expressionToDisplayString, parseExpressionOrNull, slotOperandToExpression } from "./expression.js";
import { buildSymbolicExpression, evaluateSymbolicExpression, executeSlotsValue } from "./engine.js";
import {
  applyDigitInput,
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
import { isDigitKey, isOperatorKey, isUnaryOperatorKey } from "./buttonRegistry.js";
import { resolveKeyActionHandlerId, type KeyActionHandlerId } from "./keyActionHandlers.js";
import type { Digit, ErrorCode, ExecKey, ExecutionErrorKind, ExpressionConstant, GameState, Key, RationalValue, RollEntry, SlotOperator, UnaryOperator } from "./types.js";
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
const isNaturalDivisorOperator = (operator: string): boolean => operator === "#" || operator === "\u27E1";

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

const toUnaryOperatorMapping = (key: UnaryOperator): { operator: SlotOperator; operandInput: string; isNegative: boolean } => {
  if (key === "++") {
    return { operator: "+", operandInput: "1", isNegative: false };
  }
  if (key === "--") {
    return { operator: "-", operandInput: "1", isNegative: false };
  }
  return { operator: "*", operandInput: "1", isNegative: true };
};

const applyUnaryOperator = (state: GameState, key: UnaryOperator): GameState => {
  if (!state.unlocks.unaryOperators[key]) {
    return state;
  }
  const unary = toUnaryOperatorMapping(key);
  const builder = fromCalculator(state.calculator);
  const nextBuilder = applyOperatorInput(builder, unary.operator, {
    maxSlots: state.unlocks.maxSlots,
    maxOperandDigits: 1,
  });
  if (!nextBuilder.draftingSlot) {
    return state;
  }
  const nextPatch = toCalculatorPatch({
    operationSlots: nextBuilder.operationSlots,
    draftingSlot: {
      ...nextBuilder.draftingSlot,
      operandInput: unary.operandInput,
      isNegative: unary.isNegative,
    },
  });
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

const applyConstantValue = (state: GameState, constant: ExpressionConstant): GameState => {
  if (!state.unlocks.valueAtoms[constant] && !state.unlocks.valueExpression[constant]) {
    return state;
  }
  if (state.calculator.rollEntries.length > 0) {
    return state;
  }

  const builder = fromCalculator(state.calculator);
  if (builder.draftingSlot) {
    if (isNaturalDivisorOperator(builder.draftingSlot.operator)) {
      return state;
    }
    return applyUnlocks(withBuilderPatchApplied(state, {
      operationSlots: builder.operationSlots,
      draftingSlot: {
        ...builder.draftingSlot,
        operandInput: constant,
      },
    }), unlockCatalog);
  }

  if (builder.operationSlots.length > 0) {
    const operationSlots = [...builder.operationSlots];
    const slotIndex = operationSlots.length - 1;
    if (isNaturalDivisorOperator(operationSlots[slotIndex].operator)) {
      return state;
    }
    operationSlots[slotIndex] = {
      ...operationSlots[slotIndex],
      operand: constant === "e" ? { type: "constant", value: "e" } : { type: "constant", value: "pi" },
    };
    return applyUnlocks(withBuilderPatchApplied(state, { operationSlots, draftingSlot: null }), unlockCatalog);
  }

  if (!isSeedEntryContext(state)) {
    return state;
  }

  return applyUnlocks(
    {
      ...state,
      calculator: {
        ...state.calculator,
        total: toExpressionCalculatorValue(constant === "e" ? { type: "constant", value: "e" } : { type: "constant", value: "pi" }),
        pendingNegativeTotal: false,
        singleDigitInitialTotalEntry: false,
      },
    },
    unlockCatalog,
  );
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
  symbolic?: RollEntry["symbolic"];
};

const SYMBOLIC_RENDER_CHAR_CAP = 160;

const toSymbolicPayload = (exprText: string, renderText: string = exprText): NonNullable<RollEntry["symbolic"]> => {
  const truncated = renderText.length > SYMBOLIC_RENDER_CHAR_CAP;
  return {
    exprText,
    truncated,
    renderText: truncated ? renderText.slice(0, SYMBOLIC_RENDER_CHAR_CAP) : renderText,
  };
};

const toSymbolicExecution = (exprText: string, renderText: string = exprText): EvaluatedExecution => ({
  nextTotal: toNanCalculatorValue(),
  errorCode: "ALG",
  errorKind: "symbolic_result",
  symbolic: toSymbolicPayload(exprText, renderText),
});

const buildBuilderExpressionSignature = (slots: GameState["calculator"]["operationSlots"]): string => {
  let signature = "f_n(x)";
  for (const slot of slots) {
    const operand = typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand));
    signature = `(${signature}${slot.operator}${operand})`;
  }
  return signature;
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
  if (currentTotal.kind === "nan") {
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode: NAN_INPUT_ERROR_CODE,
      errorKind: "nan_input",
    };
  }

  const execution = executeSlotsValue(currentTotal, state.calculator.operationSlots);
  if (!execution.ok) {
    if (execution.reason === "unsupported_symbolic") {
      return {
        nextTotal: toNanCalculatorValue(),
        errorCode: NAN_INPUT_ERROR_CODE,
        errorKind: "nan_input",
      };
    }
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode: execution.reason === "division_by_zero" ? DIVISION_BY_ZERO_ERROR_CODE : NAN_INPUT_ERROR_CODE,
      errorKind: execution.reason === "division_by_zero" ? "division_by_zero" : "nan_input",
    };
  }

  if (!isRationalCalculatorValue(execution.total)) {
    if (execution.total.kind !== "expr") {
      return {
        nextTotal: toNanCalculatorValue(),
        errorCode: NAN_INPUT_ERROR_CODE,
        errorKind: "nan_input",
      };
    }
    const symbolicExpression = buildSymbolicExpression(currentTotal, state.calculator.operationSlots);
    const expressionForEvaluation = symbolicExpression.ok ? symbolicExpression.expression : execution.total.value;
    const expressionKey = buildBuilderExpressionSignature(state.calculator.operationSlots);
    const symbolicEvaluation = evaluateSymbolicExpression(expressionForEvaluation);
    const symbolicText = symbolicEvaluation.ok
      ? symbolicEvaluation.value.simplifiedText
      : symbolicEvaluation.simplifiedText;
    if (!symbolicEvaluation.ok) {
      return toSymbolicExecution(expressionKey, symbolicText);
    }
    const rationalized = symbolicEvaluation.value.rationalValue;
    if (!rationalized) {
      return toSymbolicExecution(expressionKey, symbolicText);
    }
    const overflowChecked = applyOverflowPolicy(rationalized, state.unlocks.maxTotalDigits);
    return {
      ...overflowChecked,
      symbolic: toSymbolicPayload(expressionKey, symbolicText),
      ...(execution.euclidRemainder ? { euclidRemainder: execution.euclidRemainder } : {}),
    };
  }

  const overflowChecked = applyOverflowPolicy(execution.total.value, state.unlocks.maxTotalDigits);
  return {
    ...overflowChecked,
    euclidRemainder: execution.euclidRemainder,
  };
};

const toRollEntry = (evaluation: EvaluatedExecution): RollEntry => ({
  y: evaluation.nextTotal,
  ...(evaluation.euclidRemainder && !evaluation.errorCode ? { remainder: evaluation.euclidRemainder } : {}),
  ...(evaluation.symbolic ? { symbolic: evaluation.symbolic } : {}),
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

const NUMERIC_DIGIT_RE = /^[0-9]$/;
const isNumericDigit = (key: string): key is Digit => NUMERIC_DIGIT_RE.test(key);
const isValueAtomConstant = (key: Key): key is ExpressionConstant => key === "pi" || key === "e";

const applyBackspace = (state: GameState): GameState => {
  if (!state.unlocks.utilities["\u2190"]) {
    return state;
  }
  if (state.calculator.rollEntries.length > 0) {
    return state;
  }

  const slotToDrafting = (slot: { operator: SlotOperator; operand: GameState["calculator"]["operationSlots"][number]["operand"] }) => {
    if (typeof slot.operand === "bigint") {
      return {
        operator: slot.operator,
        operandInput: (slot.operand < 0n ? -slot.operand : slot.operand).toString(),
        isNegative: slot.operand < 0n && slot.operand !== 0n,
      };
    }
    const expr = slotOperandToExpression(slot.operand);
    if (expr.type === "unary" && expr.op === "neg") {
      return {
        operator: slot.operator,
        operandInput: calculatorValueToDisplayString(toExpressionCalculatorValue(expr.arg)),
        isNegative: true,
      };
    }
    return {
      operator: slot.operator,
      operandInput: calculatorValueToDisplayString(toExpressionCalculatorValue(expr)),
      isNegative: false,
    };
  };

  const drafting = state.calculator.draftingSlot;
  if (drafting) {
    if (drafting.operandInput.length > 0) {
      const nextInput = /^\d+$/.test(drafting.operandInput) ? drafting.operandInput.slice(0, -1) : "";
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
    const trimmedInput = /^\d+$/.test(restoredDrafting.operandInput) ? restoredDrafting.operandInput.slice(0, -1) : "";
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

const isDigit = (key: Key): key is Digit => isDigitKey(key) && isNumericDigit(key);
const isValueAtomDigit = (key: Key): key is Key => isDigitKey(key);
const isOperator = (key: Key): key is SlotOperator => isOperatorKey(key);
const isUnaryOperator = (key: Key): key is UnaryOperator => isUnaryOperatorKey(key);

const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.rollEntries.length === 0 || (!isOperator(key) && !isUnaryOperator(key))) {
    return state;
  }

  if (isOperator(key) && !state.unlocks.slotOperators[key]) {
    return state;
  }
  if (isUnaryOperator(key) && !state.unlocks.unaryOperators[key]) {
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
  if (state.calculator.rollEntries.length > 0 && isValueAtomDigit(key)) {
    return state;
  }

  const preprocessed = preprocessForActiveRoll(state, key);
  const keyed = isKeyUnlocked(preprocessed, key) ? incrementKeyPressCount(preprocessed, key) : preprocessed;

  const handlers: Record<KeyActionHandlerId, (nextState: GameState, currentKey: Key) => GameState> = {
    apply_digit: (nextState, currentKey) => {
      if (isDigit(currentKey)) {
        return applyDigit(nextState, currentKey);
      }
      if (isValueAtomConstant(currentKey)) {
        return applyConstantValue(nextState, currentKey);
      }
      return nextState;
    },
    apply_operator: (nextState, currentKey) => (isOperator(currentKey) ? applyOperator(nextState, currentKey) : nextState),
    apply_unary_operator: (nextState, currentKey) => (isUnaryOperator(currentKey) ? applyUnaryOperator(nextState, currentKey) : nextState),
    apply_execute: (nextState) => nextState,
    apply_utility: (nextState) => nextState,
    apply_visualizer_noop: (nextState) => nextState,
    apply_toggle_noop: (nextState) => nextState,
    apply_noop: (nextState) => nextState,
    apply_memory: (nextState, currentKey) => applyMemoryKeyAction(nextState, currentKey),
    apply_clear_all: (nextState) => applyC(nextState),
    apply_clear_entry: (nextState) => applyCE(nextState),
    apply_backspace: (nextState) => applyBackspace(nextState),
    apply_undo: (nextState) => applyUnlocks(applyUndo(nextState), unlockCatalog),
    apply_equals: (nextState) => applyEquals(nextState),
  };

  const handlerId = resolveKeyActionHandlerId(key);
  return handlers[handlerId](keyed, key);
};
