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
import { isKeyUsableForInput } from "./keyUnlocks.js";
import { clearOperationEntry, createInitialStepProgressState, createResetCalculatorState } from "./reducer.stateBuilders.js";
import {
  CHECKLIST_UNLOCK_ID,
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
  getButtonFace,
  isBinaryOperatorKeyId,
  isConstantKeyId,
  isDigitKeyId,
  isNaturalDivisorOperatorKeyId,
  isUnaryOperatorId,
  KEY_ID,
  resolveKeyId,
  type ConstantKeyId,
} from "./keyPresentation.js";
import { getRollYPrimeFactorization } from "./rollDerived.js";
import { buildExecutionStagePlan, type ExecutionStage, type WrapStageMode } from "./executionPlan.js";
import { getAppServices } from "../contracts/appServices.js";

export const getUnlockCatalog = () => getAppServices().contentProvider.unlockCatalog;

// PRESS_KEY behavior and key-flow preprocessing/dispatch.
export const incrementKeyPressCount = (state: GameState, key: Key): GameState => ({
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

export const applyOperator = (state: GameState, operator: BinarySlotOperator): GameState => {
  if (!isKeyUsableForInput(state, operator)) {
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

export const applyUnaryOperator = (state: GameState, key: UnaryOperator): GameState => {
  if (!isKeyUsableForInput(state, key)) {
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

export const applyDigit = (state: GameState, key: Key): GameState => {
  if (!isDigitKeyId(key)) {
    return state;
  }
  if (!isKeyUsableForInput(state, key)) {
    return state;
  }
  return applyDigitValue(state, getButtonFace(key) as Digit);
};

export const applyConstantValue = (state: GameState, constant: ConstantKeyId): GameState => {
  if (!isKeyUsableForInput(state, constant)) {
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

const applyWrapStage = (
  total: GameState["calculator"]["total"],
  mode: WrapStageMode,
  maxDigits: number,
): EvaluatedExecution => {
  if (!isRationalCalculatorValue(total)) {
    return { nextTotal: total };
  }
  const value = total.value;
  const boundary = computeOverflowBoundary(maxDigits);
  if (value.den === 1n) {
    if (mode === "mod_zero_to_delta") {
      const wrapped = euclideanModuloBigInt(value.num, boundary);
      return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
    }
    const ringWidth = boundary * 2n;
    const wrapped = euclideanModuloBigInt(value.num + boundary, ringWidth) - boundary;
    return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
  }
  return applyOverflowPolicy(value, maxDigits);
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

const withInvalidRollAnalysis = (base: GameState): GameState => ({
  ...base,
  calculator: {
    ...base.calculator,
    rollAnalysis: {
      ...base.calculator.rollAnalysis,
      stopReason: "invalid",
    },
  },
});

const withCycleRollAnalysis = (base: GameState, cycleMatchIndex: number, nextIndex: number): GameState => ({
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
});

type RollDiagnosticContext = {
  invalid: boolean;
  rollEntries: RollEntry[];
  nextIndex: number;
  current: RollEntry;
  previous: RollEntry;
  currentX: Extract<GameState["calculator"]["total"], { kind: "rational" }>;
  previousX: Extract<GameState["calculator"]["total"], { kind: "rational" }>;
  seed: Extract<GameState["calculator"]["total"], { kind: "rational" }>;
};

const resolveRollDiagnosticContext = (base: GameState): RollDiagnosticContext | null => {
  const rollEntries = [...base.calculator.rollEntries];
  const nextIndex = rollEntries.length - 1;
  if (nextIndex < 1 || base.calculator.rollAnalysis.stopReason !== "none") {
    return null;
  }

  const current = rollEntries[nextIndex];
  const previous = rollEntries[nextIndex - 1];
  if (!current || !previous) {
    return null;
  }

  const currentX = getXk(rollEntries, nextIndex);
  const previousX = getXk(rollEntries, nextIndex - 1);
  const seed = getXk(rollEntries, 0);
  if (
    !currentX
    || !previousX
    || !seed
    || !isDiagnosticRationalValue(currentX)
    || !isDiagnosticRationalValue(previousX)
    || !isDiagnosticRationalValue(seed)
    || current.error
  ) {
    return {
      invalid: true,
      rollEntries,
      nextIndex,
      current,
      previous,
      currentX: { kind: "rational", value: { num: 0n, den: 1n } },
      previousX: { kind: "rational", value: { num: 0n, den: 1n } },
      seed: { kind: "rational", value: { num: 0n, den: 1n } },
    };
  }

  return {
    invalid: false,
    rollEntries,
    nextIndex,
    current,
    previous,
    currentX,
    previousX,
    seed,
  };
};

const isInvalidDiagnosticContext = (context: RollDiagnosticContext): boolean => context.invalid;

const resolveRollDiagnosticPatch = (
  context: RollDiagnosticContext,
  operationSlots: GameState["calculator"]["operationSlots"],
): Pick<RollEntry, "d1" | "d2" | "r1" | "seedMinus1Y" | "seedPlus1Y"> | null => {
  const d1 = subRational(context.currentX.value, context.previousX.value);
  let d2: RollEntry["d2"] = null;
  if (context.nextIndex >= 2) {
    const previousD1 = context.previous.d1;
    if (!previousD1) {
      return null;
    }
    d2 = subRational(d1, previousD1);
  }

  const r1 = divRational(context.currentX.value, context.previousX.value);
  if (!r1) {
    return null;
  }

  const previousPeerMinus =
    context.nextIndex === 1
      ? toRationalCalculatorValue(addIntToRational(context.seed.value, -1n))
      : (context.previous.seedMinus1Y ?? null);
  const previousPeerPlus =
    context.nextIndex === 1
      ? toRationalCalculatorValue(addIntToRational(context.seed.value, 1n))
      : (context.previous.seedPlus1Y ?? null);

  if (!previousPeerMinus || !previousPeerPlus) {
    return null;
  }

  const seedMinus1Y = computePeerStepValue(previousPeerMinus, operationSlots);
  const seedPlus1Y = computePeerStepValue(previousPeerPlus, operationSlots);
  if (!seedMinus1Y || !seedPlus1Y) {
    return null;
  }

  return {
    d1,
    d2,
    r1,
    seedMinus1Y,
    seedPlus1Y,
  };
};

const withRollDiagnosticsApplied = (
  base: GameState,
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState => {
  const context = resolveRollDiagnosticContext(base);
  if (!context) {
    return base;
  }
  if (isInvalidDiagnosticContext(context)) {
    return withInvalidRollAnalysis(base);
  }

  const cycleMatchIndex = context.rollEntries
    .slice(0, context.nextIndex)
    .findIndex((entry) => calculatorValueEquals(entry.y, context.current.y));
  if (cycleMatchIndex >= 0) {
    return withCycleRollAnalysis(base, cycleMatchIndex, context.nextIndex);
  }

  const patch = resolveRollDiagnosticPatch(context, operationSlots);
  if (!patch) {
    return withInvalidRollAnalysis(base);
  }

  context.rollEntries[context.nextIndex] = {
    ...context.current,
    ...patch,
  };

  return {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: context.rollEntries,
    },
  };
};

export const hasStepThroughOnKeypad = (state: GameState): boolean =>
  state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === KEY_ID.exec_step_through);

export const withClearedStepProgress = (state: GameState): GameState => ({
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
  options: {
    deferOverflowToWrapStage?: boolean;
  } = {},
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
    const overflowChecked = options.deferOverflowToWrapStage
      ? { nextTotal: toRationalCalculatorValue(rationalized) }
      : applyOverflowPolicy(rationalized, state.unlocks.maxTotalDigits);
    return {
      ...overflowChecked,
      symbolic: toSymbolicPayload(expressionKey, symbolicText),
      ...(execution.euclidRemainder ? { euclidRemainder: execution.euclidRemainder } : {}),
    };
  }

  const overflowChecked = options.deferOverflowToWrapStage
    ? { nextTotal: toRationalCalculatorValue(execution.total.value) }
    : applyOverflowPolicy(execution.total.value, state.unlocks.maxTotalDigits);
  return {
    ...overflowChecked,
    euclidRemainder: execution.euclidRemainder,
  };
};

const evaluateExecutionPlan = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  stages: ExecutionStage[],
): EvaluatedExecution => {
  if (stages.length === 0) {
    return evaluateExecutionOutcomeForSlots(state, seedTotal, []);
  }

  const maybeLastStage = stages.at(-1);
  const wrapStage: Extract<ExecutionStage, { kind: "wrap" }> | null =
    maybeLastStage && maybeLastStage.kind === "wrap" ? maybeLastStage : null;
  const slotStages = wrapStage ? stages.slice(0, -1) : stages;
  const slotList = slotStages
    .filter((stage): stage is Extract<ExecutionStage, { kind: "slot" }> => stage.kind === "slot")
    .map((stage) => stage.slot);

  let evaluation = slotList.length > 0
    ? evaluateExecutionOutcomeForSlots(state, seedTotal, slotList, {
      deferOverflowToWrapStage: Boolean(wrapStage),
    })
    : wrapStage
      ? { nextTotal: seedTotal }
      : evaluateExecutionOutcomeForSlots(state, seedTotal, []);

  if (!wrapStage || evaluation.errorKind) {
    return evaluation;
  }

  const wrapped = applyWrapStage(evaluation.nextTotal, wrapStage.mode, state.unlocks.maxTotalDigits);
  return {
    ...wrapped,
    ...(evaluation.symbolic ? { symbolic: evaluation.symbolic } : {}),
  };
};

const finalizeTerminalExecution = (
  finalized: GameState,
  evaluation: EvaluatedExecution,
  options: {
    clearStepProgress?: boolean;
  } = {},
): GameState => {
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
      ...(options.clearStepProgress ? { stepProgress: createInitialStepProgressState() } : {}),
    },
  };
  const withRoll = withRollDiagnosticsApplied(withRollBase, finalized.calculator.operationSlots);
  const withOverflowMarker = evaluation.errorKind === "overflow" ? markOverflowErrorSeen(withRoll) : withRoll;
  return applyUnlocks(withOverflowMarker, getUnlockCatalog());
};

export const applyEquals = (state: GameState): GameState => {
  const equalsKey = KEY_ID.exec_equals;
  if (!isKeyUsableForInput(state, equalsKey)) {
    return state;
  }

  const finalized = withClearedStepProgress(finalizeDraftingSlot(state));
  const executionPlan = buildExecutionStagePlan(finalized.calculator.operationSlots, finalized);
  const evaluation = evaluateExecutionPlan(finalized, finalized.calculator.total, executionPlan);
  return finalizeTerminalExecution(finalized, evaluation);
};

export const applyEqualsFromStepProgress = (state: GameState): GameState => {
  const equalsKey = KEY_ID.exec_equals;
  if (!isKeyUsableForInput(state, equalsKey)) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const stepProgress = finalized.calculator.stepProgress;
  if (!stepProgress.active || !stepProgress.currentTotal) {
    return applyEquals(finalized);
  }

  const executionPlan = buildExecutionStagePlan(finalized.calculator.operationSlots, finalized);
  const remainingStages = executionPlan.slice(stepProgress.nextSlotIndex);
  if (remainingStages.length === 0) {
    return withClearedStepProgress(finalized);
  }

  const evaluation = evaluateExecutionPlan(finalized, stepProgress.currentTotal, remainingStages);
  return finalizeTerminalExecution(finalized, evaluation, { clearStepProgress: true });
};

export const applyStepThrough = (state: GameState): GameState => {
  return applyStepThroughInternal(state, { requireStepThroughKeyOnKeypad: true });
};

const applyStepThroughInternal = (
  state: GameState,
  options: {
    requireStepThroughKeyOnKeypad: boolean;
  },
): GameState => {
  const stepKey = KEY_ID.exec_step_through;
  if (options.requireStepThroughKeyOnKeypad && !hasStepThroughOnKeypad(state)) {
    return withClearedStepProgress(state);
  }
  if (options.requireStepThroughKeyOnKeypad && !isKeyUsableForInput(state, stepKey)) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const executionPlan = buildExecutionStagePlan(finalized.calculator.operationSlots, finalized);
  if (executionPlan.length === 0) {
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

  if (!stepProgress.currentTotal || stepProgress.nextSlotIndex >= executionPlan.length) {
    return withClearedStepProgress(finalized);
  }

  const stage = executionPlan[stepProgress.nextSlotIndex];
  const nextStage = executionPlan[stepProgress.nextSlotIndex + 1];
  const deferOverflowToWrapStage = nextStage?.kind === "wrap";
  const evaluation = stage.kind === "slot"
    ? evaluateExecutionOutcomeForSlots(
      finalized,
      stepProgress.currentTotal,
      [stage.slot],
      { deferOverflowToWrapStage },
    )
    : applyWrapStage(stepProgress.currentTotal, stage.mode, finalized.unlocks.maxTotalDigits);
  const nextResults = [...stepProgress.executedSlotResults, evaluation.nextTotal];
  const isTerminal = evaluation.errorKind !== undefined || stepProgress.nextSlotIndex + 1 >= executionPlan.length;

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

  return finalizeTerminalExecution(finalized, evaluation, { clearStepProgress: true });
};

export const canAutoStepProgress = (state: GameState): boolean => {
  const finalized = finalizeDraftingSlot(state);
  const executionPlan = buildExecutionStagePlan(finalized.calculator.operationSlots, finalized);
  if (executionPlan.length === 0) {
    return false;
  }
  const progress = finalized.calculator.stepProgress;
  if (!progress.active) {
    return true;
  }
  return Boolean(progress.currentTotal) && progress.nextSlotIndex < executionPlan.length;
};

export const applyAutoStepTick = (state: GameState): GameState => {
  if (!canAutoStepProgress(state)) {
    return state;
  }
  return applyStepThroughInternal(state, { requireStepThroughKeyOnKeypad: false });
};

export const applyC = (state: GameState): GameState => {
  if (!isKeyUsableForInput(state, KEY_ID.util_clear_all)) {
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

export const isValueAtomConstant = (key: Key): key is ConstantKeyId => isConstantKeyId(key);

const slotToDrafting = (slot: BinarySlot): NonNullable<GameState["calculator"]["draftingSlot"]> => {
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

const withBackspaceBuilderPatch = (
  state: GameState,
  patch: Pick<GameState["calculator"], "operationSlots" | "draftingSlot">,
): GameState => applyUnlocks(withBuilderPatchApplied(state, patch), getUnlockCatalog());

const withSeedTotalBackspaced = (state: GameState): GameState => {
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
    getUnlockCatalog(),
  );
};

const withDraftingBackspaced = (
  state: GameState,
  originalState: GameState,
  drafting: NonNullable<GameState["calculator"]["draftingSlot"]>,
): GameState => {
  if (drafting.operandInput.length > 0) {
    const nextInput = /^\d+$/.test(drafting.operandInput) ? drafting.operandInput.slice(0, -1) : "";
    if (nextInput === drafting.operandInput) {
      return originalState;
    }
    return withBackspaceBuilderPatch(state, {
      operationSlots: state.calculator.operationSlots,
      draftingSlot: {
        ...drafting,
        operandInput: nextInput,
      },
    });
  }
  if (drafting.isNegative && drafting.operandInput.length === 0) {
    return withBackspaceBuilderPatch(state, {
      operationSlots: state.calculator.operationSlots,
      draftingSlot: {
        ...drafting,
        isNegative: false,
      },
    });
  }
  if (state.calculator.operationSlots.length > 0) {
    const priorCommitted = state.calculator.operationSlots[state.calculator.operationSlots.length - 1];
    if (!("operand" in priorCommitted)) {
      return withBackspaceBuilderPatch(state, {
        operationSlots: state.calculator.operationSlots.slice(0, -1),
        draftingSlot: null,
      });
    }
    return withBackspaceBuilderPatch(state, {
      operationSlots: state.calculator.operationSlots.slice(0, -1),
      draftingSlot: slotToDrafting(priorCommitted),
    });
  }
  return withBackspaceBuilderPatch(state, {
    operationSlots: state.calculator.operationSlots,
    draftingSlot: null,
  });
};

const withCommittedSlotBackspaced = (state: GameState): GameState => {
  if (state.calculator.operationSlots.length === 0) {
    return state;
  }
  const lastCommitted = state.calculator.operationSlots[state.calculator.operationSlots.length - 1];
  if (!("operand" in lastCommitted)) {
    return withBackspaceBuilderPatch(state, {
      operationSlots: state.calculator.operationSlots.slice(0, -1),
      draftingSlot: null,
    });
  }
  const restoredDrafting = slotToDrafting(lastCommitted);
  const trimmedInput = /^\d+$/.test(restoredDrafting.operandInput) ? restoredDrafting.operandInput.slice(0, -1) : "";
  return withBackspaceBuilderPatch(state, {
    operationSlots: state.calculator.operationSlots.slice(0, -1),
    draftingSlot: {
      ...restoredDrafting,
      operandInput: trimmedInput,
    },
  });
};

export const applyBackspace = (state: GameState): GameState => {
  const withClearedStep = withClearedStepProgress(state);
  if (!isKeyUsableForInput(state, KEY_ID.util_backspace)) {
    return withClearedStep;
  }
  if (withClearedStep.calculator.rollEntries.length > 0) {
    return withClearedStep;
  }

  const drafting = withClearedStep.calculator.draftingSlot;
  if (drafting) {
    return withDraftingBackspaced(withClearedStep, state, drafting);
  }

  if (withClearedStep.calculator.operationSlots.length > 0) {
    return withCommittedSlotBackspaced(withClearedStep);
  }

  return withSeedTotalBackspaced(withClearedStep);
};

export const applyUndo = (state: GameState): GameState => {
  const withClearedStep = withClearedStepProgress(state);
  if (!isKeyUsableForInput(state, KEY_ID.util_undo)) {
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

export const isDigit = (key: Key): boolean => isDigitKeyId(key);
export const isValueAtomDigit = (key: Key): key is Key => isDigitKeyId(key);
export const isOperator = (key: Key): key is BinarySlotOperator => isBinaryOperatorKeyId(key);
export const isUnaryOperator = (key: Key): key is UnaryOperator => isUnaryOperatorId(key);

export const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.rollEntries.length === 0 || (!isOperator(key) && !isUnaryOperator(key))) {
    return state;
  }

  if (isOperator(key) && !isKeyUsableForInput(state, key)) {
    return state;
  }
  if (isUnaryOperator(key) && !isKeyUsableForInput(state, key)) {
    return state;
  }
  return clearOperationEntry(state);
};

export const applyMemoryKeyAction = (state: GameState, key: Key): GameState => {
  if (!isMemoryKey(key) || !isKeyUsableForInput(state, key)) {
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

export const applyUndoWithUnlocks = (state: GameState): GameState => applyUnlocks(applyUndo(state), getUnlockCatalog());

const createKeyActionHandlers = (): Record<KeyActionHandlerId, (nextState: GameState, currentKey: Key) => GameState> => ({
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
});

export const applyKeyActionCore = (state: GameState, keyLike: KeyInput): GameState => {
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
  const isUsable = isKeyUsableForInput(preprocessed, key);
  const keyed = isUsable ? incrementKeyPressCount(preprocessed, key) : preprocessed;
  if (!isUsable) {
    return keyed;
  }

  const handlers = createKeyActionHandlers();
  const handlerId = resolveKeyActionHandlerId(key);
  return handlers[handlerId](keyed, key);
};

