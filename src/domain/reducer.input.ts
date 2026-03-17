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
import { expressionToDisplayString, slotOperandToExpression } from "./expression.js";
import { buildSymbolicExpression, evaluateSymbolicExpression, executeSlotsValue } from "./engine.js";
import {
  applyDigitInput,
  applyOperatorInput,
  finalizeDrafting,
  fromCalculator,
  toCalculatorPatch,
} from "./functionBuilder.js";
import {
  addIntToRational,
  appendSeedIfMissing,
  appendStepRow,
  createRollEntry,
  divRational,
  getXk,
  subRational,
  calculatorValueEquals,
} from "./rollEntries.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import { clearOperationEntry, createInitialStepProgressState, createResetCalculatorState } from "./reducer.stateBuilders.js";
import {
  CHECKLIST_UNLOCK_ID,
  DELTA_RANGE_CLAMP_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
  OVERFLOW_ERROR_SEEN_ID,
} from "./state.js";
import { resolveKeyActionHandlerId, type KeyActionHandlerId } from "./keyActionHandlers.js";
import type {
  BinarySlotOperator,
  Digit,
  ErrorCode,
  ExecutionErrorKind,
  GameState,
  Key,
  KeyInput,
  RationalValue,
  RollEntry,
  BinarySlot,
  UnaryOperator,
  Slot,
} from "./types.js";
import { applyUnlocks } from "./unlocks.js";
import {
  applyMemoryAdjust,
  cycleMemoryVariable,
  isMemoryCycleKey,
  isMemoryKey,
  isMemoryMinusKey,
  isMemoryPlusKey,
  isMemoryRecallKey,
  resolveMemoryRecallDigit,
} from "./memoryController.js";
import {
  isBinaryOperatorKeyId,
  isConstantKeyId,
  isDigitKeyId,
  isNaturalDivisorOperatorKeyId,
  isUnaryOperatorId,
  KEY_ID,
  resolveKeyId,
  toLegacyKey,
  type ConstantKeyId,
} from "./keyPresentation.js";
import { getRollYPrimeFactorization } from "./rollDerived.js";
import { getContentProvider } from "../contracts/contentRegistry.js";

const getUnlockCatalog = () => getContentProvider().unlockCatalog;

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
const isNaturalDivisorOperator = (operator: Key): boolean => isNaturalDivisorOperatorKeyId(operator);
const toExpressionConstant = (constantKey: ConstantKeyId): "pi" | "e" =>
  constantKey === KEY_ID.const_e ? "e" : "pi";

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

const applyOperator = (state: GameState, operator: BinarySlotOperator): GameState => {
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

  return applyUnlocks(withBuilderPatchApplied(state, nextPatch), getUnlockCatalog());
};

const applyUnaryOperator = (state: GameState, key: UnaryOperator): GameState => {
  if (!state.unlocks.unaryOperators[key]) {
    return state;
  }
  let baseOperationSlots = state.calculator.operationSlots;
  let nextDraftingSlot = state.calculator.draftingSlot;

  if (state.calculator.draftingSlot) {
    if (state.calculator.draftingSlot.operandInput !== "") {
      const committedDraft = finalizeDrafting(fromCalculator(state.calculator));
      if (committedDraft.draftingSlot !== null) {
        return state;
      }
      baseOperationSlots = committedDraft.operationSlots;
      nextDraftingSlot = null;
    } else {
      // Unary slots are terminal/committed entries, so an empty binary draft is discarded.
      nextDraftingSlot = null;
    }
  }

  if (baseOperationSlots.length >= state.unlocks.maxSlots) {
    return state;
  }

  const nextPatch = {
    operationSlots: [...baseOperationSlots, { kind: "unary" as const, operator: key }],
    draftingSlot: nextDraftingSlot,
  };
  if (
    nextPatch.operationSlots === state.calculator.operationSlots
    && nextPatch.draftingSlot === state.calculator.draftingSlot
  ) {
    return state;
  }
  return applyUnlocks(withBuilderPatchApplied(state, nextPatch), getUnlockCatalog());
};

const applyDigit = (state: GameState, key: Key): GameState => {
  if (!isDigitKeyId(key)) {
    return state;
  }
  if (!state.unlocks.valueAtoms[key] && !state.unlocks.valueExpression[key]) {
    return state;
  }
  return applyDigitValue(state, toLegacyKey(key) as Digit);
};

const applyConstantValue = (state: GameState, constant: ConstantKeyId): GameState => {
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
    }), getUnlockCatalog());
  }

  if (builder.operationSlots.length > 0) {
    const operationSlots = [...builder.operationSlots];
    const slotIndex = operationSlots.length - 1;
    const target = operationSlots[slotIndex];
    if (target.kind !== "binary" || isNaturalDivisorOperator(target.operator)) {
      return state;
    }
    operationSlots[slotIndex] = {
      ...target,
      operand: { type: "constant", value: toExpressionConstant(constant) },
    };
    return applyUnlocks(withBuilderPatchApplied(state, { operationSlots, draftingSlot: null }), getUnlockCatalog());
  }

  if (!isSeedEntryContext(state)) {
    return state;
  }

  return applyUnlocks(
    {
      ...state,
      calculator: {
        ...state.calculator,
        total: toExpressionCalculatorValue({ type: "constant", value: toExpressionConstant(constant) }),
        pendingNegativeTotal: false,
        singleDigitInitialTotalEntry: false,
      },
    },
    getUnlockCatalog(),
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
    return applyUnlocks(withBuilderPatchApplied(state, nextPatch), getUnlockCatalog());
  }
  if (state.calculator.draftingSlot !== null || state.calculator.operationSlots.length > 0) {
    return state;
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

  return applyUnlocks(withNextTotal, getUnlockCatalog());
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
    if (slot.kind === "unary") {
      signature = `(${signature}${slot.operator})`;
    } else {
      const operand = typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand));
      signature = `(${signature}${slot.operator}${operand})`;
    }
  }
  return signature;
};

const euclideanModuloBigInt = (value: bigint, modulus: bigint): bigint => {
  if (modulus <= 0n) {
    throw new Error("Modulus must be positive.");
  }
  const remainder = value % modulus;
  return remainder < 0n ? remainder + modulus : remainder;
};

const applyOverflowPolicy = (value: RationalValue, maxDigits: number, state: GameState): EvaluatedExecution => {
  const deltaRangeWrapEnabled = Boolean(state.ui.buttonFlags[DELTA_RANGE_CLAMP_FLAG]);
  const modZeroToDeltaEnabled = Boolean(state.ui.buttonFlags[MOD_ZERO_TO_DELTA_FLAG]);
  const boundary = computeOverflowBoundary(maxDigits);
  if (modZeroToDeltaEnabled && value.den === 1n) {
    const wrapped = euclideanModuloBigInt(value.num, boundary);
    return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
  }
  if (deltaRangeWrapEnabled && value.den === 1n) {
    const ringWidth = boundary * 2n;
    const wrapped = euclideanModuloBigInt(value.num + boundary, ringWidth) - boundary;
    return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
  }
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

const toRollEntry = (evaluation: EvaluatedExecution): RollEntry => {
  const factorization = getRollYPrimeFactorization(evaluation.nextTotal);
  return createRollEntry(evaluation.nextTotal, {
    ...(evaluation.euclidRemainder && !evaluation.errorCode ? { remainder: evaluation.euclidRemainder } : {}),
    ...(evaluation.symbolic ? { symbolic: evaluation.symbolic } : {}),
    ...(factorization ? { factorization } : {}),
    ...(evaluation.errorCode && evaluation.errorKind
      ? {
        error: {
          code: evaluation.errorCode,
          kind: evaluation.errorKind,
        },
      }
      : {}),
  });
};

const isDiagnosticRationalValue = (
  value: GameState["calculator"]["total"],
): value is Extract<GameState["calculator"]["total"], { kind: "rational" }> => value.kind === "rational";

const computePeerStepValue = (
  previousPeer: GameState["calculator"]["total"],
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState["calculator"]["total"] | null => {
  if (previousPeer.kind !== "rational") {
    return null;
  }
  const executed = executeSlotsValue(previousPeer, operationSlots);
  if (!executed.ok || executed.total.kind !== "rational") {
    return null;
  }
  return executed.total;
};

const withRollDiagnosticsApplied = (
  base: GameState,
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState => {
  const rollEntries = [...base.calculator.rollEntries];
  const nextIndex = rollEntries.length - 1;
  if (nextIndex < 1) {
    return base;
  }
  if (base.calculator.rollAnalysis.stopReason !== "none") {
    return base;
  }

  const current = rollEntries[nextIndex];
  const previous = rollEntries[nextIndex - 1];
  if (!current || !previous) {
    return base;
  }

  const currentX = getXk(rollEntries, nextIndex);
  const previousX = getXk(rollEntries, nextIndex - 1);
  if (!currentX || !previousX || !isDiagnosticRationalValue(currentX) || !isDiagnosticRationalValue(previousX) || current.error) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          ...base.calculator.rollAnalysis,
          stopReason: "invalid",
        },
      },
    };
  }

  const seed = getXk(rollEntries, 0);
  if (!seed || !isDiagnosticRationalValue(seed)) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          ...base.calculator.rollAnalysis,
          stopReason: "invalid",
        },
      },
    };
  }

  const cycleMatchIndex = rollEntries
    .slice(0, nextIndex)
    .findIndex((entry) => calculatorValueEquals(entry.y, current.y));
  if (cycleMatchIndex >= 0) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          stopReason: "cycle",
          cycle: {
            i: cycleMatchIndex,
            j: nextIndex,
            transientLength: cycleMatchIndex,
            periodLength: nextIndex - cycleMatchIndex,
          },
        },
      },
    };
  }

  const d1 = subRational(currentX.value, previousX.value);
  let d2: typeof current.d2 = null;
  if (nextIndex >= 2) {
    const previousD1 = previous.d1;
    if (!previousD1) {
      return {
        ...base,
        calculator: {
          ...base.calculator,
          rollAnalysis: {
            ...base.calculator.rollAnalysis,
            stopReason: "invalid",
          },
        },
      };
    }
    d2 = subRational(d1, previousD1);
  }

  const r1 = divRational(currentX.value, previousX.value);
  if (!r1) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          ...base.calculator.rollAnalysis,
          stopReason: "invalid",
        },
      },
    };
  }

  const previousPeerMinus =
    nextIndex === 1
      ? toRationalCalculatorValue(addIntToRational(seed.value, -1n))
      : (previous.seedMinus1Y ?? null);
  const previousPeerPlus =
    nextIndex === 1
      ? toRationalCalculatorValue(addIntToRational(seed.value, 1n))
      : (previous.seedPlus1Y ?? null);

  if (!previousPeerMinus || !previousPeerPlus) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          ...base.calculator.rollAnalysis,
          stopReason: "invalid",
        },
      },
    };
  }

  const seedMinus1Y = computePeerStepValue(previousPeerMinus, operationSlots);
  const seedPlus1Y = computePeerStepValue(previousPeerPlus, operationSlots);
  if (!seedMinus1Y || !seedPlus1Y) {
    return {
      ...base,
      calculator: {
        ...base.calculator,
        rollAnalysis: {
          ...base.calculator.rollAnalysis,
          stopReason: "invalid",
        },
      },
    };
  }

  rollEntries[nextIndex] = {
    ...current,
    d1,
    d2,
    r1,
    seedMinus1Y,
    seedPlus1Y,
  };

  return {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries,
    },
  };
};

const hasStepThroughOnKeypad = (state: GameState): boolean =>
  state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === KEY_ID.exec_step_through);

const withClearedStepProgress = (state: GameState): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    stepProgress: createInitialStepProgressState(),
  },
});

const evaluateExecutionOutcomeForSlots = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  operationSlots: Slot[],
): EvaluatedExecution => {
  if (seedTotal.kind === "nan") {
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode: NAN_INPUT_ERROR_CODE,
      errorKind: "nan_input",
    };
  }

  const execution = executeSlotsValue(seedTotal, operationSlots);
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
    const symbolicExpression = buildSymbolicExpression(seedTotal, operationSlots);
    const expressionForEvaluation = symbolicExpression.ok ? symbolicExpression.expression : execution.total.value;
    const expressionKey = buildBuilderExpressionSignature(operationSlots);
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
    const overflowChecked = applyOverflowPolicy(rationalized, state.unlocks.maxTotalDigits, state);
    return {
      ...overflowChecked,
      symbolic: toSymbolicPayload(expressionKey, symbolicText),
      ...(execution.euclidRemainder ? { euclidRemainder: execution.euclidRemainder } : {}),
    };
  }

  const overflowChecked = applyOverflowPolicy(execution.total.value, state.unlocks.maxTotalDigits, state);
  return {
    ...overflowChecked,
    euclidRemainder: execution.euclidRemainder,
  };
};

const applyEquals = (state: GameState): GameState => {
  const equalsKey = KEY_ID.exec_equals;
  if (!state.unlocks.execution[equalsKey]) {
    return state;
  }

  const finalized = withClearedStepProgress(finalizeDraftingSlot(state));
  const evaluation = evaluateExecutionOutcomeForSlots(
    finalized,
    finalized.calculator.total,
    finalized.calculator.operationSlots,
  );
  const nextEntry = toRollEntry(evaluation);
  const withSeed = appendSeedIfMissing(finalized.calculator.rollEntries, finalized.calculator.total);
  const nextRollEntries = appendStepRow(withSeed, nextEntry);

  const withRollBase: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      rollEntries: nextRollEntries,
    },
  };
  const withRoll = withRollDiagnosticsApplied(withRollBase, finalized.calculator.operationSlots);

  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, getUnlockCatalog());
};

const applyEqualsFromStepProgress = (state: GameState): GameState => {
  const equalsKey = KEY_ID.exec_equals;
  if (!state.unlocks.execution[equalsKey]) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const stepProgress = finalized.calculator.stepProgress;
  if (!stepProgress.active || !stepProgress.currentTotal) {
    return applyEquals(finalized);
  }

  const remainingSlots = finalized.calculator.operationSlots.slice(stepProgress.nextSlotIndex);
  if (remainingSlots.length === 0) {
    return withClearedStepProgress(finalized);
  }

  const evaluation = evaluateExecutionOutcomeForSlots(finalized, stepProgress.currentTotal, remainingSlots);
  const nextEntry = toRollEntry(evaluation);
  const withSeed = appendSeedIfMissing(finalized.calculator.rollEntries, finalized.calculator.total);
  const nextRollEntries = appendStepRow(withSeed, nextEntry);

  const withRollBase: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      rollEntries: nextRollEntries,
      stepProgress: createInitialStepProgressState(),
    },
  };
  const withRoll = withRollDiagnosticsApplied(withRollBase, finalized.calculator.operationSlots);
  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, getUnlockCatalog());
};

const applyStepThrough = (state: GameState): GameState => {
  const stepKey = KEY_ID.exec_step_through;
  if (!state.unlocks.execution[stepKey]) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  if (finalized.calculator.operationSlots.length === 0) {
    return withClearedStepProgress(finalized);
  }

  const priorProgress = finalized.calculator.stepProgress;
  const stepProgress =
    priorProgress.active && priorProgress.currentTotal
      ? priorProgress
      : {
          active: true,
          seedTotal: finalized.calculator.total,
          currentTotal: finalized.calculator.total,
          nextSlotIndex: 0,
          executedSlotResults: [],
        };

  if (!stepProgress.currentTotal || stepProgress.nextSlotIndex >= finalized.calculator.operationSlots.length) {
    return withClearedStepProgress(finalized);
  }

  const slot = finalized.calculator.operationSlots[stepProgress.nextSlotIndex];
  const evaluation = evaluateExecutionOutcomeForSlots(finalized, stepProgress.currentTotal, [slot]);
  const nextResults = [...stepProgress.executedSlotResults, evaluation.nextTotal];
  const isTerminal = evaluation.errorKind !== undefined || stepProgress.nextSlotIndex + 1 >= finalized.calculator.operationSlots.length;

  if (!isTerminal) {
    return applyUnlocks(
      {
        ...finalized,
        calculator: {
          ...finalized.calculator,
          stepProgress: {
            active: true,
            seedTotal: stepProgress.seedTotal,
            currentTotal: evaluation.nextTotal,
            nextSlotIndex: stepProgress.nextSlotIndex + 1,
            executedSlotResults: nextResults,
          },
        },
      },
      getUnlockCatalog(),
    );
  }

  const nextEntry = toRollEntry(evaluation);
  const withSeed = appendSeedIfMissing(finalized.calculator.rollEntries, finalized.calculator.total);
  const nextRollEntries = appendStepRow(withSeed, nextEntry);
  const withRollBase: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: evaluation.nextTotal,
      pendingNegativeTotal: false,
      rollEntries: nextRollEntries,
      stepProgress: createInitialStepProgressState(),
    },
  };
  const withRoll = withRollDiagnosticsApplied(withRollBase, finalized.calculator.operationSlots);
  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, getUnlockCatalog());
};

const applyC = (state: GameState): GameState => {
  if (!state.unlocks.utilities[KEY_ID.util_clear_all]) {
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

const isValueAtomConstant = (key: Key): key is ConstantKeyId => isConstantKeyId(key);

const applyBackspace = (state: GameState): GameState => {
  const withClearedStep = withClearedStepProgress(state);
  if (!state.unlocks.utilities[KEY_ID.util_backspace]) {
    return withClearedStep;
  }
  if (withClearedStep.calculator.rollEntries.length > 0) {
    return withClearedStep;
  }

  const slotToDrafting = (slot: BinarySlot) => {
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

  const drafting = withClearedStep.calculator.draftingSlot;
  if (drafting) {
    if (drafting.operandInput.length > 0) {
      const nextInput = /^\d+$/.test(drafting.operandInput) ? drafting.operandInput.slice(0, -1) : "";
      if (nextInput === drafting.operandInput) {
        return state;
      }
      return applyUnlocks(
        withBuilderPatchApplied(withClearedStep, {
          operationSlots: withClearedStep.calculator.operationSlots,
          draftingSlot: {
            ...drafting,
            operandInput: nextInput,
          },
        }),
        getUnlockCatalog(),
      );
    }
    if (drafting.isNegative && drafting.operandInput.length === 0) {
      return applyUnlocks(
        withBuilderPatchApplied(withClearedStep, {
          operationSlots: withClearedStep.calculator.operationSlots,
          draftingSlot: {
            ...drafting,
            isNegative: false,
          },
        }),
        getUnlockCatalog(),
      );
    }

    if (withClearedStep.calculator.operationSlots.length > 0) {
      const priorCommitted = withClearedStep.calculator.operationSlots[withClearedStep.calculator.operationSlots.length - 1];
      if (!("operand" in priorCommitted)) {
        return applyUnlocks(
          withBuilderPatchApplied(withClearedStep, {
            operationSlots: withClearedStep.calculator.operationSlots.slice(0, -1),
            draftingSlot: null,
          }),
          getUnlockCatalog(),
        );
      }
      return applyUnlocks(
        withBuilderPatchApplied(withClearedStep, {
          operationSlots: withClearedStep.calculator.operationSlots.slice(0, -1),
          draftingSlot: slotToDrafting(priorCommitted),
        }),
        getUnlockCatalog(),
      );
    }

    return applyUnlocks(
      withBuilderPatchApplied(withClearedStep, {
        operationSlots: withClearedStep.calculator.operationSlots,
        draftingSlot: null,
      }),
      getUnlockCatalog(),
    );
  }

  if (withClearedStep.calculator.operationSlots.length > 0) {
    const lastCommitted = withClearedStep.calculator.operationSlots[withClearedStep.calculator.operationSlots.length - 1];
    if (!("operand" in lastCommitted)) {
      return applyUnlocks(
        withBuilderPatchApplied(withClearedStep, {
          operationSlots: withClearedStep.calculator.operationSlots.slice(0, -1),
          draftingSlot: null,
        }),
        getUnlockCatalog(),
      );
    }
    const restoredDrafting = slotToDrafting(lastCommitted);
    const trimmedInput = /^\d+$/.test(restoredDrafting.operandInput) ? restoredDrafting.operandInput.slice(0, -1) : "";
    return applyUnlocks(
      withBuilderPatchApplied(withClearedStep, {
        operationSlots: withClearedStep.calculator.operationSlots.slice(0, -1),
        draftingSlot: {
          ...restoredDrafting,
          operandInput: trimmedInput,
        },
      }),
      getUnlockCatalog(),
    );
  }

  if (!isSeedEntryContext(withClearedStep) || !isRationalCalculatorValue(withClearedStep.calculator.total) || !isInteger(withClearedStep.calculator.total.value)) {
    return withClearedStep;
  }
  const value = withClearedStep.calculator.total.value;
  const magnitudeText = value.num < 0n ? (-value.num).toString() : value.num.toString();
  const nextMagnitudeText = magnitudeText.length <= 1 ? "0" : magnitudeText.slice(0, -1);
  const nextMagnitude = BigInt(nextMagnitudeText);
  const shouldBeNegative = value.num < 0n;
  const nextNum = nextMagnitude === 0n ? 0n : shouldBeNegative ? -nextMagnitude : nextMagnitude;
  if (nextNum === value.num) {
    return withClearedStep;
  }

  return applyUnlocks(
    {
      ...withClearedStep,
      calculator: {
        ...withClearedStep.calculator,
        total: toRationalCalculatorValue({ num: nextNum, den: 1n }),
      },
    },
    getUnlockCatalog(),
  );
};

const applyUndo = (state: GameState): GameState => {
  const withClearedStep = withClearedStepProgress(state);
  if (!state.unlocks.utilities[KEY_ID.util_undo]) {
    return withClearedStep;
  }

  if (withClearedStep.calculator.rollEntries.length === 0) {
    return withClearedStep;
  }

  const nextRollEntries = withClearedStep.calculator.rollEntries.slice(0, -1);
  const nextTotal = nextRollEntries[nextRollEntries.length - 1]?.y ?? createResetCalculatorState().total;
  return {
    ...withClearedStep,
    calculator: {
      ...withClearedStep.calculator,
      total: nextTotal,
      rollEntries: nextRollEntries,
      rollAnalysis: {
        stopReason: "none",
        cycle: null,
      },
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: nextRollEntries.length === 0,
    },
  };
};

const isDigit = (key: Key): boolean => isDigitKeyId(key);
const isValueAtomDigit = (key: Key): key is Key => isDigitKeyId(key);
const isOperator = (key: Key): key is BinarySlotOperator => isBinaryOperatorKeyId(key);
const isUnaryOperator = (key: Key): key is UnaryOperator => isUnaryOperatorId(key);

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
  if (isMemoryCycleKey(key)) {
    return cycleMemoryVariable(state);
  }
  if (isMemoryRecallKey(key)) {
    return applyDigitValue(state, resolveMemoryRecallDigit(state));
  }
  if (isMemoryPlusKey(key)) {
    return applyMemoryAdjust(state, 1);
  }
  if (isMemoryMinusKey(key)) {
    return applyMemoryAdjust(state, -1);
  }
  return state;
};

export const applyKeyAction = (state: GameState, keyLike: KeyInput): GameState => {
  const stepAwareState = hasStepThroughOnKeypad(state) ? state : withClearedStepProgress(state);
  const key = resolveKeyId(keyLike);
  // Input precedence:
  // 1) active-roll digit keys are hard no-op
  // 2) active-roll operator keys clear current operation entry before handling
  // 3) normal key dispatch
  if (stepAwareState.calculator.rollEntries.length > 0 && isValueAtomDigit(key)) {
    return stepAwareState;
  }

  const preprocessed = preprocessForActiveRoll(stepAwareState, key);
  const isUnlocked = isKeyUnlocked(preprocessed, key);
  const keyed = isUnlocked ? incrementKeyPressCount(preprocessed, key) : preprocessed;
  if (!isUnlocked) {
    return keyed;
  }

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
    apply_backspace: (nextState) => applyBackspace(nextState),
    apply_undo: (nextState) => applyUnlocks(applyUndo(nextState), getUnlockCatalog()),
    apply_equals: (nextState) => (
      nextState.calculator.stepProgress.active ? applyEqualsFromStepProgress(nextState) : applyEquals(nextState)
    ),
    apply_step_through: (nextState) => applyStepThrough(nextState),
  };

  const handlerId = resolveKeyActionHandlerId(key);
  return handlers[handlerId](keyed, key);
};

