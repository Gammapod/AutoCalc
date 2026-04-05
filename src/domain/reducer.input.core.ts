import { isInteger } from "../infra/math/rationalEngine.js";
import {
  clampRationalToBoundary,
  calculatorValueToDisplayString,
  calculatorValueToRational,
  computeOverflowBoundary,
  exceedsMagnitudeBoundary,
  isRationalCalculatorValue,
  OVERFLOW_ERROR_CODE,
  toComplexCalculatorValue,
  toExplicitComplexCalculatorValue,
  toExpressionCalculatorValue,
  toExpressionScalarValue,
  toNanCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
  toScalarValue,
} from "./calculatorValue.js";
import { expressionToDisplayString, slotOperandToExpression, symbolicExpr } from "./expression.js";
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
  buildAnalysisRollProjection,
  normalizeAnalysisIgnoredRollEntries,
  createRollEntry,
  divRational,
  getXk,
  subRational,
  calculatorValueEquals,
} from "./rollEntries.js";
import { isKeyUsableForInput } from "./keyUnlocks.js";
import { clearOperationEntry, createInitialStepProgressState, createResetCalculatorState } from "./reducer.stateBuilders.js";
import {
  BINARY_ADD_RESULT_ONE_SEEN_ID,
  BINARY_MUL_RESULT_ZERO_SEEN_ID,
  C_CLEARED_FUNCTION_TWO_SLOTS_SEEN_ID,
  EXECUTION_PAUSE_EQUALS_FLAG,
  NAN_RESULT_SEEN_ID,
  OVERFLOW_ERROR_SEEN_ID,
  OVERFLOW_ERROR_IN_BINARY_MODE_SEEN_ID,
  UNDO_WHILE_FEED_VISIBLE_SEEN_ID,
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
  SlotOperator,
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
  isUnaryOperatorId,
  KEY_ID,
  resolveKeyId,
  type ConstantKeyId,
} from "./keyPresentation.js";
import { getRollYPrimeFactorization } from "./rollDerived.js";
import { type WrapStageMode } from "./executionPlanIR.js";
import {
  buildExecutionPlanIRForState,
  getExecutionPlanIRStageAt,
  getExecutionPlanIRStageCount,
  materializeSlotsFromExecutionPlanIR,
  type ExecutionPlanBuildResult,
} from "./executionPlanIR.js";
import { resolveRollInversePlan, type InverseExecutionStage } from "./rollInverseExecution.js";
import { clearExecutionModeFlags } from "./executionModePolicy.js";
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
const getDisplayRadix = (state: GameState): 2 | 10 =>
  state.settings.base === "base2" ? 2 : 10;

const getMagnitudeText = (total: GameState["calculator"]["total"]): string => {
  if (!isRationalCalculatorValue(total) || !isInteger(total.value)) {
    return "0";
  }
  return total.value.num < 0n ? (-total.value.num).toString() : total.value.num.toString();
};

const isSeedEntryContext = (state: GameState): boolean =>
  state.calculator.rollEntries.length <= 1 &&
  state.calculator.operationSlots.length === 0 &&
  state.calculator.draftingSlot === null;

const hasExecutedRollSteps = (state: GameState): boolean => state.calculator.rollEntries.length > 1;

const hasStartedFunctionBuild = (state: GameState): boolean =>
  state.calculator.operationSlots.length > 0 || state.calculator.draftingSlot !== null;

const withSeedRollSyncedToBuildState = (state: GameState): GameState => {
  if (hasExecutedRollSteps(state)) {
    return state;
  }
  const shouldHaveSeedRow = hasStartedFunctionBuild(state);
  const currentSeedRow = state.calculator.rollEntries[0];
  if (!shouldHaveSeedRow) {
    if (state.calculator.rollEntries.length === 0) {
      return state;
    }
    return {
      ...state,
      calculator: {
        ...state.calculator,
        rollEntries: [],
        rollAnalysis: {
          stopReason: "none",
          cycle: null,
        },
      },
    };
  }
  if (!currentSeedRow) {
    return {
      ...state,
      calculator: {
        ...state.calculator,
        rollEntries: [createRollEntry(state.calculator.total)],
      },
    };
  }
  if (calculatorValueEquals(currentSeedRow.y, state.calculator.total)) {
    return state;
  }
  return {
    ...state,
    calculator: {
      ...state.calculator,
      rollEntries: [{ ...currentSeedRow, y: state.calculator.total }],
    },
  };
};

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

  return applyUnlocks(withSeedRollSyncedToBuildState(withBuilderPatchApplied(state, nextPatch)), getUnlockCatalog());
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
  return applyUnlocks(withSeedRollSyncedToBuildState(withBuilderPatchApplied(state, nextPatch)), getUnlockCatalog());
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
  // Player input path: constants are not directly enterable as seed or right operand.
  void constant;
  return state;
};

const applyDigitValue = (state: GameState, digit: Digit): GameState => {
  if (hasExecutedRollSteps(state)) {
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
    return applyUnlocks(withSeedRollSyncedToBuildState(withBuilderPatchApplied(state, nextPatch)), getUnlockCatalog());
  }
  if (state.calculator.draftingSlot !== null || state.calculator.operationSlots.length > 0) {
    return state;
  }

  const nextTotalMagnitudeInput = getNextTotalMagnitudeInput(state, digit);
  if (nextTotalMagnitudeInput.length > state.unlocks.maxTotalDigits) {
    return state;
  }

  const nextMagnitude = BigInt(nextTotalMagnitudeInput);
  const boundary = computeOverflowBoundary(state.unlocks.maxTotalDigits, getDisplayRadix(state));
  if (nextMagnitude > boundary) {
    return state;
  }
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

const resolveNanErrorCode = (
  operationSlots: Slot[],
  options: {
    fallback?: ErrorCode;
    operatorId?: SlotOperator;
  } = {},
): ErrorCode => {
  if (options.operatorId) {
    return options.operatorId;
  }
  const tailOperator = operationSlots[operationSlots.length - 1]?.operator;
  if (tailOperator) {
    return tailOperator;
  }
  return options.fallback ?? "seed_nan";
};

const INVERSE_AMBIGUOUS_ERROR_CODE: ErrorCode = "inverse_ambiguous";

const toAmbiguousExecution = (): EvaluatedExecution => ({
  nextTotal: toNanCalculatorValue(),
  errorCode: INVERSE_AMBIGUOUS_ERROR_CODE,
  errorKind: "ambiguous",
});

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const normalizeRationalValue = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    throw new Error("Invalid rational denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  let num = value.num * sign;
  let den = value.den * sign;
  let a = absBigInt(num);
  let b = absBigInt(den);
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  num /= a;
  den /= a;
  return { num, den };
};

const negateScalarValue = (scalar: ReturnType<typeof toScalarValue>): ReturnType<typeof toScalarValue> =>
  scalar.kind === "rational"
    ? toRationalScalarValue({ num: -scalar.value.num, den: scalar.value.den })
    : toExpressionScalarValue({ type: "unary", op: "neg", arg: scalar.value });

const rootSymbolicExpr = (radicandText: string, exponent: bigint): ReturnType<typeof symbolicExpr> =>
  symbolicExpr(`((${radicandText})^(1/${exponent.toString()}))`);

const powExactWithin = (base: bigint, exponent: bigint, ceiling: bigint): bigint | null => {
  if (exponent < 0n) {
    return null;
  }
  let result = 1n;
  let factor = base;
  let power = exponent;
  while (power > 0n) {
    if ((power & 1n) === 1n) {
      result *= factor;
      if (result > ceiling) {
        return null;
      }
    }
    power >>= 1n;
    if (power > 0n) {
      factor *= factor;
      if (factor > ceiling) {
        return null;
      }
    }
  }
  return result;
};

const exactNthRootBigInt = (value: bigint, exponent: bigint): bigint | null => {
  if (exponent <= 0n) {
    return null;
  }
  if (value === 0n) {
    return 0n;
  }
  const odd = (exponent % 2n) === 1n;
  if (value < 0n) {
    if (!odd) {
      return null;
    }
    const positive = exactNthRootBigInt(-value, exponent);
    return positive === null ? null : -positive;
  }
  let lo = 0n;
  let hi = value;
  while (lo <= hi) {
    const mid = (lo + hi) / 2n;
    const powered = powExactWithin(mid, exponent, value);
    if (powered === null || powered > value) {
      hi = mid - 1n;
      continue;
    }
    if (powered < value) {
      lo = mid + 1n;
      continue;
    }
    return mid;
  }
  return null;
};

const buildCanonicalRootValue = (
  total: GameState["calculator"]["total"],
  exponent: bigint,
): GameState["calculator"]["total"] | null => {
  if (exponent <= 0n) {
    return null;
  }
  const rational = calculatorValueToRational(total);
  if (rational) {
    const normalized = normalizeRationalValue(rational);
    const odd = (exponent % 2n) === 1n;
    const numAbs = absBigInt(normalized.num);
    const denAbs = absBigInt(normalized.den);
    const rootNum = exactNthRootBigInt(numAbs, exponent);
    const rootDen = exactNthRootBigInt(denAbs, exponent);
    if (rootNum !== null && rootDen !== null) {
      if (normalized.num < 0n && !odd) {
        const imag = toRationalScalarValue({ num: rootNum, den: rootDen });
        return toExplicitComplexCalculatorValue(toRationalScalarValue({ num: 0n, den: 1n }), imag);
      }
      const signedNum = normalized.num < 0n && odd ? -rootNum : rootNum;
      return toRationalCalculatorValue({ num: signedNum, den: rootDen });
    }
    const absText = calculatorValueToDisplayString(toRationalCalculatorValue({ num: numAbs, den: denAbs }));
    if (normalized.num < 0n && !odd) {
      if (exponent === 2n) {
        const imag = toExpressionScalarValue(rootSymbolicExpr(absText, exponent));
        return toExplicitComplexCalculatorValue(toRationalScalarValue({ num: 0n, den: 1n }), imag);
      }
      const mag = rootSymbolicExpr(absText, exponent);
      return toExplicitComplexCalculatorValue(
        toExpressionScalarValue(symbolicExpr(`(${expressionToDisplayString(mag)}*cos(pi/${exponent.toString()}))`)),
        toExpressionScalarValue(symbolicExpr(`(${expressionToDisplayString(mag)}*sin(pi/${exponent.toString()}))`)),
      );
    }
    if (normalized.num < 0n && odd) {
      return toExpressionCalculatorValue(symbolicExpr(`(-${expressionToDisplayString(rootSymbolicExpr(absText, exponent))})`));
    }
    return toExpressionCalculatorValue(rootSymbolicExpr(absText, exponent));
  }

  if (total.kind === "complex") {
    return null;
  }
  const baseText = calculatorValueToDisplayString(total);
  return toExpressionCalculatorValue(rootSymbolicExpr(baseText, exponent));
};

const toSymbolicPayload = (exprText: string, renderText: string = exprText): NonNullable<RollEntry["symbolic"]> => {
  const truncated = renderText.length > SYMBOLIC_RENDER_CHAR_CAP;
  return {
    exprText,
    truncated,
    renderText: truncated ? renderText.slice(0, SYMBOLIC_RENDER_CHAR_CAP) : renderText,
  };
};

const toSymbolicExecution = (
  errorCode: ErrorCode,
  exprText: string,
  renderText: string = exprText,
): EvaluatedExecution => ({
  nextTotal: toNanCalculatorValue(),
  errorCode,
  errorKind: "symbolic_result",
  symbolic: toSymbolicPayload(exprText, renderText),
});

const toRecordedComplexResult = (value: GameState["calculator"]["total"]): GameState["calculator"]["total"] => {
  if (value.kind === "nan") {
    return value;
  }
  if (value.kind === "complex") {
    return toExplicitComplexCalculatorValue(value.value.re, value.value.im);
  }
  return toExplicitComplexCalculatorValue(
    toScalarValue(value),
    { kind: "rational", value: { num: 0n, den: 1n } },
  );
};

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

const applyOverflowPolicy = (value: RationalValue, maxDigits: number, radix: number = 10): EvaluatedExecution => {
  const boundary = computeOverflowBoundary(maxDigits, radix);
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
  radix: number = 10,
): EvaluatedExecution => {
  if (!isRationalCalculatorValue(total)) {
    return { nextTotal: total };
  }
  const value = total.value;
  const boundary = computeOverflowBoundary(maxDigits, radix);
  if (value.den === 1n) {
    if (mode === "mod_zero_to_delta") {
      const wrapped = euclideanModuloBigInt(value.num, boundary);
      return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
    }
    const ringWidth = boundary * 2n;
    const wrapped = euclideanModuloBigInt(value.num + boundary, ringWidth) - boundary;
    return { nextTotal: toRationalCalculatorValue({ num: wrapped, den: 1n }) };
  }
  return applyOverflowPolicy(value, maxDigits, radix);
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

const toRollEntryWithPatch = (
  evaluation: EvaluatedExecution,
  patch: Partial<Pick<RollEntry, "origin" | "analysisIgnored">> = {},
): RollEntry => ({
  ...toRollEntry(evaluation),
  ...patch,
});

const toDiagnosticRationalValue = (
  value: GameState["calculator"]["total"],
): Extract<GameState["calculator"]["total"], { kind: "rational" }> | null => {
  if (value.kind === "rational") {
    return value;
  }
  if (
    value.kind === "complex"
    && value.value.re.kind === "rational"
    && value.value.im.kind === "rational"
    && value.value.im.value.num === 0n
  ) {
    return { kind: "rational", value: value.value.re.value };
  }
  return null;
};

const computePeerStepValue = (
  previousPeer: GameState["calculator"]["total"],
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState["calculator"]["total"] | null => {
  const peerRational = toDiagnosticRationalValue(previousPeer);
  if (!peerRational) {
    return null;
  }
  const executed = executeSlotsValue(peerRational, operationSlots);
  if (!executed.ok) {
    return null;
  }
  const nextRational = toDiagnosticRationalValue(executed.total);
  if (!nextRational) {
    return null;
  }
  return nextRational;
};

const withInvalidRollAnalysis = (base: GameState): GameState => ({
  ...base,
  calculator: {
    ...base.calculator,
    rollAnalysis: {
      stopReason: "invalid",
      cycle: null,
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

  const currentXRaw = getXk(rollEntries, nextIndex);
  const previousXRaw = getXk(rollEntries, nextIndex - 1);
  const seedRaw = getXk(rollEntries, 0);
  const currentX = currentXRaw ? toDiagnosticRationalValue(currentXRaw) : null;
  const previousX = previousXRaw ? toDiagnosticRationalValue(previousXRaw) : null;
  const seed = seedRaw ? toDiagnosticRationalValue(seedRaw) : null;
  if (
    !currentX
    || !previousX
    || !seed
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

const markCompletedUnlockId = (state: GameState, unlockId: string): GameState => {
  if (state.completedUnlockIds.includes(unlockId)) {
    return state;
  }
  return {
    ...state,
    completedUnlockIds: [...state.completedUnlockIds, unlockId],
  };
};

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
    r1: r1 ?? null,
    seedMinus1Y,
    seedPlus1Y,
  };
};

const withIncrementalRollDiagnosticsApplied = (
  base: GameState,
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState => {
  const context = resolveRollDiagnosticContext(base);
  if (!context) {
    return base;
  }
  if (context.invalid) {
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

const clearRollDiagnosticFields = (entry: RollEntry): RollEntry => {
  const {
    d1: _d1,
    d2: _d2,
    r1: _r1,
    seedMinus1Y: _seedMinus1Y,
    seedPlus1Y: _seedPlus1Y,
    ...rest
  } = entry;
  return rest;
};

const withRollDiagnosticsApplied = (
  base: GameState,
  operationSlots: GameState["calculator"]["operationSlots"],
): GameState => {
  const requiresAnalysisProjection = base.calculator.rollEntries.some(
    (entry, index) => index > 0 && (entry.origin === "roll_inverse" || entry.analysisIgnored),
  );
  if (!requiresAnalysisProjection) {
    return withIncrementalRollDiagnosticsApplied(base, operationSlots);
  }

  const rollEntries = normalizeAnalysisIgnoredRollEntries(base.calculator.rollEntries)
    .map((entry) => clearRollDiagnosticFields(entry));
  const projection = buildAnalysisRollProjection(rollEntries);
  const baseRollState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries,
      rollAnalysis: {
        stopReason: "none" as const,
        cycle: null,
      },
    },
  };
  if (projection.length < 2) {
    return baseRollState;
  }

  const seed = projection[0]?.entry.y;
  const seedRational = seed ? toDiagnosticRationalValue(seed) : null;
  if (!seedRational) {
    return {
      ...baseRollState,
      calculator: {
        ...baseRollState.calculator,
        rollAnalysis: {
          stopReason: "invalid",
          cycle: null,
        },
      },
    };
  }

  for (let analysisIndex = 1; analysisIndex < projection.length; analysisIndex += 1) {
    const currentProjection = projection[analysisIndex];
    const previousProjection = projection[analysisIndex - 1];
    if (!currentProjection || !previousProjection) {
      continue;
    }

    const current = rollEntries[currentProjection.rawIndex];
    const previous = rollEntries[previousProjection.rawIndex];
    const currentX = current?.y ? toDiagnosticRationalValue(current.y) : null;
    const previousX = previous?.y ? toDiagnosticRationalValue(previous.y) : null;
    if (
      !current
      || !previous
      || !currentX
      || !previousX
      || current.error
    ) {
      return {
        ...baseRollState,
        calculator: {
          ...baseRollState.calculator,
          rollEntries,
          rollAnalysis: {
            stopReason: "invalid",
            cycle: null,
          },
        },
      };
    }

    const cycleMatchAnalysisIndex = projection
      .slice(0, analysisIndex)
      .findIndex((candidate) => calculatorValueEquals(candidate.entry.y, current.y));
    if (cycleMatchAnalysisIndex >= 0) {
      const cycleStart = projection[cycleMatchAnalysisIndex];
      if (!cycleStart) {
        return {
          ...baseRollState,
          calculator: {
            ...baseRollState.calculator,
            rollEntries,
            rollAnalysis: {
              stopReason: "invalid",
              cycle: null,
            },
          },
        };
      }
      return {
        ...baseRollState,
        calculator: {
          ...baseRollState.calculator,
          rollEntries,
          rollAnalysis: {
            stopReason: "cycle",
            cycle: {
              i: cycleStart.rawIndex,
              j: currentProjection.rawIndex,
              transientLength: cycleMatchAnalysisIndex,
              periodLength: analysisIndex - cycleMatchAnalysisIndex,
            },
          },
        },
      };
    }

    const d1 = subRational(currentX.value, previousX.value);
    let d2: RollEntry["d2"] = null;
    if (analysisIndex >= 2) {
      const previousD1 = previous.d1;
      if (!previousD1) {
        return {
          ...baseRollState,
          calculator: {
            ...baseRollState.calculator,
            rollEntries,
            rollAnalysis: {
              stopReason: "invalid",
              cycle: null,
            },
          },
        };
      }
      d2 = subRational(d1, previousD1);
    }

    const r1 = divRational(currentX.value, previousX.value);
    const previousPeerMinus =
      analysisIndex === 1
        ? toRationalCalculatorValue(addIntToRational(seedRational.value, -1n))
        : (previous.seedMinus1Y ?? null);
    const previousPeerPlus =
      analysisIndex === 1
        ? toRationalCalculatorValue(addIntToRational(seedRational.value, 1n))
        : (previous.seedPlus1Y ?? null);
    if (!previousPeerMinus || !previousPeerPlus) {
      return {
        ...baseRollState,
        calculator: {
          ...baseRollState.calculator,
          rollEntries,
          rollAnalysis: {
            stopReason: "invalid",
            cycle: null,
          },
        },
      };
    }

    const seedMinus1Y = computePeerStepValue(previousPeerMinus, operationSlots);
    const seedPlus1Y = computePeerStepValue(previousPeerPlus, operationSlots);
    if (!seedMinus1Y || !seedPlus1Y) {
      return {
        ...baseRollState,
        calculator: {
          ...baseRollState.calculator,
          rollEntries,
          rollAnalysis: {
            stopReason: "invalid",
            cycle: null,
          },
        },
      };
    }

    rollEntries[currentProjection.rawIndex] = {
      ...current,
      d1,
      d2,
      r1: r1 ?? null,
      seedMinus1Y,
      seedPlus1Y,
    };
  }

  return baseRollState;
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
    const firstSlot = operationSlots[0];
    const startsWithUnaryNot = Boolean(
      firstSlot && firstSlot.kind === "unary" && resolveKeyId(firstSlot.operator) === KEY_ID.unary_not,
    );
    if (!startsWithUnaryNot) {
      return {
        nextTotal: toNanCalculatorValue(),
        errorCode: resolveNanErrorCode(operationSlots, { fallback: "seed_nan" }),
        errorKind: "nan_input",
      };
    }
  }

  const execution = executeSlotsValue(seedTotal, operationSlots);
  if (!execution.ok) {
    const errorCode = resolveNanErrorCode(operationSlots, {
      operatorId: execution.operatorId,
      fallback: "seed_nan",
    });
    return {
      nextTotal: toNanCalculatorValue(),
      errorCode,
      errorKind: execution.reason === "division_by_zero" ? "division_by_zero" : "nan_input",
    };
  }

  if (!isRationalCalculatorValue(execution.total)) {
    if (execution.total.kind === "complex") {
      return {
        nextTotal: toRecordedComplexResult(execution.total),
        ...(execution.euclidRemainder ? { euclidRemainder: execution.euclidRemainder } : {}),
      };
    }
    if (execution.total.kind !== "expr") {
      return {
        nextTotal: toNanCalculatorValue(),
        errorCode: resolveNanErrorCode(operationSlots, { fallback: "seed_nan" }),
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
      return toSymbolicExecution(resolveNanErrorCode(operationSlots, { fallback: "seed_nan" }), expressionKey, symbolicText);
    }
    const rationalized = symbolicEvaluation.value.rationalValue;
    if (!rationalized) {
      return toSymbolicExecution(resolveNanErrorCode(operationSlots, { fallback: "seed_nan" }), expressionKey, symbolicText);
    }
    const overflowChecked = options.deferOverflowToWrapStage
      ? { nextTotal: toRationalCalculatorValue(rationalized) }
      : applyOverflowPolicy(rationalized, state.unlocks.maxTotalDigits, getDisplayRadix(state));
    return {
      ...overflowChecked,
      nextTotal: overflowChecked.nextTotal,
      symbolic: toSymbolicPayload(expressionKey, symbolicText),
      ...(execution.euclidRemainder ? { euclidRemainder: execution.euclidRemainder } : {}),
    };
  }

  const overflowChecked = options.deferOverflowToWrapStage
    ? { nextTotal: toRationalCalculatorValue(execution.total.value) }
    : applyOverflowPolicy(execution.total.value, state.unlocks.maxTotalDigits, getDisplayRadix(state));
  return {
    ...overflowChecked,
    nextTotal: overflowChecked.nextTotal,
    euclidRemainder: execution.euclidRemainder,
  };
};

const buildReducerExecutionPlan = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  operationSlots: Slot[] = state.calculator.operationSlots,
): ExecutionPlanBuildResult =>
  buildExecutionPlanIRForState(seedTotal, operationSlots, state);

type ExecutionRuntime =
  | { kind: "forward"; built: ExecutionPlanBuildResult }
  | { kind: "inverse"; stages: InverseExecutionStage[] };

const resolveExecutionBuildForMode = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  mode: GameState["calculator"]["stepProgress"]["mode"],
): { runtime: ExecutionRuntime; initialEvaluation?: EvaluatedExecution } => {
  if (mode !== "inverse") {
    return { runtime: { kind: "forward", built: buildReducerExecutionPlan(state, seedTotal) } };
  }
  const inversePlan = resolveRollInversePlan(state.calculator.operationSlots, state.settings);
  if (!inversePlan.ok) {
    return {
      runtime: { kind: "inverse", stages: [] },
      initialEvaluation: toAmbiguousExecution(),
    };
  }
  return { runtime: { kind: "inverse", stages: inversePlan.stages } };
};

const evaluateExecutionPlanRange = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  built: ExecutionPlanBuildResult,
  startStageIndex: number = 0,
): EvaluatedExecution => {
  const slotList = materializeSlotsFromExecutionPlanIR(built.plan);
  const startSlotIndex = Math.max(0, Math.min(startStageIndex, slotList.length));
  const pendingSlots = slotList.slice(startSlotIndex);
  const hasPendingWrap = Boolean(built.wrapStageMode) && startStageIndex <= slotList.length;

  let evaluation = pendingSlots.length > 0
    ? evaluateExecutionOutcomeForSlots(state, seedTotal, pendingSlots, {
      deferOverflowToWrapStage: hasPendingWrap,
    })
    : hasPendingWrap
      ? { nextTotal: seedTotal }
      : evaluateExecutionOutcomeForSlots(state, seedTotal, []);

  if (!hasPendingWrap || !built.wrapStageMode || evaluation.errorKind) {
    return evaluation;
  }

  const wrapped = applyWrapStage(
    evaluation.nextTotal,
    built.wrapStageMode,
    state.unlocks.maxTotalDigits,
    getDisplayRadix(state),
  );
  return {
    ...wrapped,
    nextTotal: wrapped.nextTotal,
    ...(evaluation.symbolic ? { symbolic: evaluation.symbolic } : {}),
  };
};

const evaluateExecutionPlanStageAt = (
  state: GameState,
  currentTotal: GameState["calculator"]["total"],
  built: ExecutionPlanBuildResult,
  stageIndex: number,
): EvaluatedExecution | null => {
  const stage = getExecutionPlanIRStageAt(built.plan, stageIndex);
  if (!stage) {
    return null;
  }
  if (stage.kind === "wrap") {
    return applyWrapStage(
      currentTotal,
      stage.mode,
      state.unlocks.maxTotalDigits,
      getDisplayRadix(state),
    );
  }
  const nextStage = getExecutionPlanIRStageAt(built.plan, stageIndex + 1);
  return evaluateExecutionOutcomeForSlots(
    state,
    currentTotal,
    [stage.slot],
    { deferOverflowToWrapStage: nextStage?.kind === "wrap" },
  );
};

const evaluateInverseStageAt = (
  state: GameState,
  currentTotal: GameState["calculator"]["total"],
  stages: InverseExecutionStage[],
  stageIndex: number,
): EvaluatedExecution | null => {
  const stage = stages[stageIndex];
  if (!stage) {
    return null;
  }
  if (stage.kind === "slot") {
    return evaluateExecutionOutcomeForSlots(state, currentTotal, [stage.slot]);
  }
  if (stage.kind === "divide_by_i") {
    if (currentTotal.kind === "nan") {
      return toAmbiguousExecution();
    }
    const re = toScalarValue(currentTotal.kind === "complex" ? currentTotal.value.re : currentTotal);
    const im = currentTotal.kind === "complex"
      ? currentTotal.value.im
      : toRationalScalarValue({ num: 0n, den: 1n });
    return {
      nextTotal: toExplicitComplexCalculatorValue(im, negateScalarValue(re)),
    };
  }
  const rootValue = buildCanonicalRootValue(currentTotal, stage.exponent);
  if (!rootValue) {
    return toAmbiguousExecution();
  }
  if (!stage.reciprocal) {
    return { nextTotal: rootValue };
  }
  return evaluateExecutionOutcomeForSlots(state, rootValue, [{ kind: "binary", operator: KEY_ID.op_pow, operand: -1n }]);
};

const getExecutionRuntimeStageCount = (runtime: ExecutionRuntime): number =>
  runtime.kind === "forward"
    ? getExecutionPlanIRStageCount(runtime.built.plan)
    : runtime.stages.length;

const evaluateExecutionRuntimeRange = (
  state: GameState,
  seedTotal: GameState["calculator"]["total"],
  runtime: ExecutionRuntime,
  startStageIndex: number = 0,
): EvaluatedExecution => {
  if (runtime.kind === "forward") {
    return evaluateExecutionPlanRange(state, seedTotal, runtime.built, startStageIndex);
  }
  let current = seedTotal;
  const start = Math.max(0, Math.min(startStageIndex, runtime.stages.length));
  for (let index = start; index < runtime.stages.length; index += 1) {
    const stageEvaluation = evaluateInverseStageAt(state, current, runtime.stages, index);
    if (!stageEvaluation) {
      return toAmbiguousExecution();
    }
    if (stageEvaluation.errorKind) {
      return stageEvaluation;
    }
    current = stageEvaluation.nextTotal;
  }
  return { nextTotal: current };
};

const evaluateExecutionRuntimeStageAt = (
  state: GameState,
  currentTotal: GameState["calculator"]["total"],
  runtime: ExecutionRuntime,
  stageIndex: number,
): EvaluatedExecution | null => {
  if (runtime.kind === "forward") {
    return evaluateExecutionPlanStageAt(state, currentTotal, runtime.built, stageIndex);
  }
  return evaluateInverseStageAt(state, currentTotal, runtime.stages, stageIndex);
};

const finalizeTerminalExecution = (
  finalized: GameState,
  evaluation: EvaluatedExecution,
  options: {
    clearStepProgress?: boolean;
    rollEntryPatch?: Partial<Pick<RollEntry, "origin" | "analysisIgnored">>;
  } = {},
): GameState => {
  const nextEntry = toRollEntryWithPatch(evaluation, options.rollEntryPatch);
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
  let withMarkers = withOverflowMarker;
  if (evaluation.nextTotal.kind === "nan") {
    withMarkers = markCompletedUnlockId(withMarkers, NAN_RESULT_SEEN_ID);
  }
  if (evaluation.errorKind === "overflow" && finalized.settings.base === "base2") {
    withMarkers = markCompletedUnlockId(withMarkers, OVERFLOW_ERROR_IN_BINARY_MODE_SEEN_ID);
  }
  if (finalized.settings.base === "base2" && evaluation.nextTotal.kind === "rational" && evaluation.nextTotal.value.den === 1n) {
    const hasAdd = finalized.calculator.operationSlots.some((slot) => slot.kind !== "unary" && slot.operator === KEY_ID.op_add);
    const hasMul = finalized.calculator.operationSlots.some((slot) => slot.kind !== "unary" && slot.operator === KEY_ID.op_mul);
    if (hasAdd && evaluation.nextTotal.value.num === 1n) {
      withMarkers = markCompletedUnlockId(withMarkers, BINARY_ADD_RESULT_ONE_SEEN_ID);
    }
    if (hasMul && evaluation.nextTotal.value.num === 0n) {
      withMarkers = markCompletedUnlockId(withMarkers, BINARY_MUL_RESULT_ZERO_SEEN_ID);
    }
  }
  const withExecutionStopped = evaluation.nextTotal.kind === "nan"
    ? clearExecutionModeFlags(withMarkers)
    : withMarkers;
  return applyUnlocks(withExecutionStopped, getUnlockCatalog());
};

export const applyEquals = (state: GameState): GameState => {
  const equalsKey = KEY_ID.exec_equals;
  if (!isKeyUsableForInput(state, equalsKey)) {
    return state;
  }

  const finalized = withClearedStepProgress(finalizeDraftingSlot(state));
  const built = buildReducerExecutionPlan(finalized, finalized.calculator.total);
  const evaluation = evaluateExecutionPlanRange(finalized, finalized.calculator.total, built, 0);
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

  const execution = resolveExecutionBuildForMode(
    finalized,
    stepProgress.currentTotal,
    stepProgress.mode ?? "forward",
  );
  if (execution.initialEvaluation) {
    return finalizeTerminalExecution(finalized, execution.initialEvaluation, { clearStepProgress: true });
  }
  const stageCount = getExecutionRuntimeStageCount(execution.runtime);
  if (stepProgress.nextSlotIndex >= stageCount) {
    return withClearedStepProgress(finalized);
  }

  const evaluation = evaluateExecutionRuntimeRange(
    finalized,
    stepProgress.currentTotal,
    execution.runtime,
    stepProgress.nextSlotIndex,
  );
  return finalizeTerminalExecution(finalized, evaluation, { clearStepProgress: true });
};

export const applyRollInverse = (state: GameState): GameState => {
  const rollInverseKey = KEY_ID.exec_roll_inverse;
  if (!isKeyUsableForInput(state, rollInverseKey)) {
    return state;
  }
  const finalized = finalizeDraftingSlot(state);
  const hasInversePlanOrAmbiguity = finalized.calculator.operationSlots.length > 0;
  if (!hasInversePlanOrAmbiguity) {
    return withClearedStepProgress(finalized);
  }
  const nextFlags = {
    ...finalized.ui.buttonFlags,
    [EXECUTION_PAUSE_EQUALS_FLAG]: true,
  };
  return {
    ...finalized,
    ui: {
      ...finalized.ui,
      buttonFlags: nextFlags,
    },
    calculator: {
      ...finalized.calculator,
      stepProgress: {
        active: false,
        mode: "inverse",
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
};

export const applyStepThrough = (state: GameState): GameState => {
  return applyStepThroughInternal(state, { requireStepThroughKeyOnKeypad: true, mode: "forward" });
};

const applyStepThroughInternal = (
  state: GameState,
  options: {
    requireStepThroughKeyOnKeypad: boolean;
    mode: GameState["calculator"]["stepProgress"]["mode"];
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
  const priorProgress = finalized.calculator.stepProgress;
  const mode = priorProgress.active ? (priorProgress.mode ?? "forward") : options.mode;
  const stepProgress =
    priorProgress.active && priorProgress.currentTotal
      ? priorProgress
      : {
          active: true,
          ...(mode === "inverse" ? { mode } : {}),
          seedTotal: finalized.calculator.total,
          currentTotal: finalized.calculator.total,
          nextSlotIndex: 0,
          executedSlotResults: [],
        };

  const execution = resolveExecutionBuildForMode(finalized, stepProgress.currentTotal ?? finalized.calculator.total, mode);
  if (execution.initialEvaluation) {
    return finalizeTerminalExecution(finalized, execution.initialEvaluation, { clearStepProgress: true });
  }
  const stageCount = getExecutionRuntimeStageCount(execution.runtime);
  if (stageCount === 0) {
    return withClearedStepProgress(finalized);
  }

  if (!stepProgress.currentTotal || stepProgress.nextSlotIndex >= stageCount) {
    return withClearedStepProgress(finalized);
  }

  const evaluation = evaluateExecutionRuntimeStageAt(
    finalized,
    stepProgress.currentTotal,
    execution.runtime,
    stepProgress.nextSlotIndex,
  );
  if (!evaluation) {
    return withClearedStepProgress(finalized);
  }
  const nextResults = [...stepProgress.executedSlotResults, evaluation.nextTotal];
  const isTerminal = evaluation.errorKind !== undefined || stepProgress.nextSlotIndex + 1 >= stageCount;

  if (!isTerminal) {
    return applyUnlocks(
      {
        ...finalized,
        calculator: {
          ...finalized.calculator,
          stepProgress: {
            active: true,
            ...(mode === "inverse" ? { mode } : {}),
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
  const mode = finalized.calculator.stepProgress.mode === "inverse"
    ? "inverse"
    : "forward";
  const execution = resolveExecutionBuildForMode(finalized, finalized.calculator.total, mode);
  if (execution.initialEvaluation) {
    return true;
  }
  const stageCount = getExecutionRuntimeStageCount(execution.runtime);
  if (stageCount === 0) {
    return false;
  }
  const progress = finalized.calculator.stepProgress;
  if (!progress.active) {
    return true;
  }
  return Boolean(progress.currentTotal) && progress.nextSlotIndex < stageCount;
};

export const applyAutoStepTick = (state: GameState): GameState => {
  if (!canAutoStepProgress(state)) {
    return state;
  }
  const mode = state.calculator.stepProgress.mode === "inverse"
    ? "inverse"
    : "forward";
  return applyStepThroughInternal(state, { requireStepThroughKeyOnKeypad: false, mode });
};

export const applyC = (state: GameState): GameState => {
  if (!isKeyUsableForInput(state, KEY_ID.util_clear_all)) {
    return state;
  }
  const shouldMarkFunctionCleared = state.calculator.operationSlots.length >= 2;
  const withMarker = shouldMarkFunctionCleared
    ? markCompletedUnlockId(state, C_CLEARED_FUNCTION_TWO_SLOTS_SEEN_ID)
    : state;
  return { ...withMarker, calculator: createResetCalculatorState() };
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
): GameState => applyUnlocks(withSeedRollSyncedToBuildState(withBuilderPatchApplied(state, patch)), getUnlockCatalog());

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
  if (withClearedStep.calculator.rollEntries.length > 1) {
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
  const withPoppedRoll: GameState = {
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
  const withUndoContextMarker = withClearedStep.settings.visualizer === "feed"
    ? markCompletedUnlockId(withPoppedRoll, UNDO_WHILE_FEED_VISIBLE_SEEN_ID)
    : withPoppedRoll;
  return withRollDiagnosticsApplied(withUndoContextMarker, withUndoContextMarker.calculator.operationSlots);
};

export const isDigit = (key: Key): boolean => isDigitKeyId(key);
export const isValueAtomDigit = (key: Key): key is Key => isDigitKeyId(key);
export const isOperator = (key: Key): key is BinarySlotOperator => isBinaryOperatorKeyId(key);
export const isUnaryOperator = (key: Key): key is UnaryOperator => isUnaryOperatorId(key);

export const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (!hasExecutedRollSteps(state) || (!isOperator(key) && !isUnaryOperator(key))) {
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
    const recallDigit = resolveMemoryRecallDigit(state);
    return recallDigit ? applyDigitValue(state, recallDigit) : state;
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
  apply_memory: (nextState, currentKey) => applyUnlocks(applyMemoryKeyAction(nextState, currentKey), getUnlockCatalog()),
  apply_clear_all: (nextState) => applyC(nextState),
  apply_backspace: (nextState) => applyBackspace(nextState),
  apply_undo: (nextState) => applyUnlocks(applyUndo(nextState), getUnlockCatalog()),
  apply_equals: (nextState) => (
    nextState.calculator.stepProgress.active ? applyEqualsFromStepProgress(nextState) : applyEquals(nextState)
  ),
  apply_step_through: (nextState) => applyStepThrough(nextState),
  apply_roll_inverse: (nextState) => applyRollInverse(nextState),
});

export const applyKeyActionCore = (state: GameState, keyLike: KeyInput): GameState => {
  const stepAwareState = hasStepThroughOnKeypad(state) ? state : withClearedStepProgress(state);
  const key = resolveKeyId(keyLike);
  // Input precedence:
  // 1) active-roll digit keys are hard no-op
  // 2) active-roll operator keys clear current operation entry before handling
  // 3) normal key dispatch
  if (hasExecutedRollSteps(stepAwareState) && isValueAtomDigit(key)) {
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
