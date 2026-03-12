import { parseRational, toDisplayString } from "../math/rationalEngine.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
import { isRationalCalculatorValue, toExpressionCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue } from "../../domain/calculatorValue.js";
import { expressionToDisplayString, parseExpressionOrThrow } from "../../domain/expression.js";
import { fromKeyLayoutArray } from "../../domain/keypadLayoutModel.js";
import { buildAllocatorSnapshot, createDefaultLambdaControl, sanitizeLambdaControl, withLegacyAllocatorFallback } from "../../domain/lambdaControl.js";
import { getRollYPrimeFactorization } from "../../domain/rollDerived.js";
import { isBinaryOperatorKeyId, isUnaryOperatorId, KEY_ID } from "../../domain/keyPresentation.js";
import { isValidSchemaVersion, migrateToLatest, type SerializableStateV14, type SerializableSlot } from "./migrations.js";
import type { BinarySlotOperator, GameState, PrimeFactorTerm, RationalPrimeFactorization, UnarySlotOperator } from "../../domain/types.js";

type SavePayload = {
  schemaVersion: number;
  savedAt: number;
  state: unknown;
};

type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type SerializableLambdaControl = {
  maxPoints: number;
  alpha: number;
  beta: number;
  gamma: number;
  overrides?: {
    delta?: number;
    epsilon?: string;
  };
};

type SerializableStateLatest = SerializableStateV14 & {
  lambdaControl?: SerializableLambdaControl;
};

export const enum LoadFailureReason {
  MissingSave = "missing_save",
  InvalidJson = "invalid_json",
  InvalidPayloadEnvelope = "invalid_payload_envelope",
  UnsupportedSchemaVersion = "unsupported_schema_version",
  MigrationFailed = "migration_failed",
  DeserializeFailed = "deserialize_failed",
}

export type LoadResult = {
  state: GameState | null;
  reason: LoadFailureReason | null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const serializeCalculatorValue = (value: GameState["calculator"]["total"]): string =>
  value.kind === "nan" ? "NaN" : isRationalCalculatorValue(value) ? toDisplayString(value.value) : expressionToDisplayString(value.value);

const deserializeCalculatorValue = (value: string): GameState["calculator"]["total"] =>
  value.trim() === "NaN"
    ? toNanCalculatorValue()
    : (() => {
      const expression = parseExpressionOrThrow(value);
      if (expression.type === "int_literal") {
        return toRationalCalculatorValue({ num: expression.value, den: 1n });
      }
      if (expression.type === "rational_literal") {
        return toRationalCalculatorValue(expression.value);
      }
      return toExpressionCalculatorValue(expression);
    })();

const serializePrimeFactorTerms = (terms: PrimeFactorTerm[]): Array<{ prime: string; exponent: number }> =>
  terms.map((term) => ({ prime: term.prime.toString(), exponent: term.exponent }));

const serializeFactorization = (
  factorization: RationalPrimeFactorization | undefined,
): { sign: -1 | 1; numerator: Array<{ prime: string; exponent: number }>; denominator: Array<{ prime: string; exponent: number }> } | undefined =>
  factorization
    ? {
        sign: factorization.sign,
        numerator: serializePrimeFactorTerms(factorization.numerator),
        denominator: serializePrimeFactorTerms(factorization.denominator),
      }
    : undefined;

const parsePrimeFactorTerms = (value: unknown): PrimeFactorTerm[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const terms: PrimeFactorTerm[] = [];
  for (const term of value) {
    const candidate = term as Record<string, unknown>;
    if (
      typeof term !== "object" ||
      term === null ||
      !("prime" in candidate) ||
      !("exponent" in candidate) ||
      typeof candidate.prime !== "string" ||
      typeof candidate.exponent !== "number" ||
      !Number.isInteger(candidate.exponent) ||
      candidate.exponent <= 0
    ) {
      return null;
    }
    try {
      const prime = BigInt(candidate.prime);
      if (prime < 2n) {
        return null;
      }
      terms.push({ prime, exponent: candidate.exponent });
    } catch {
      return null;
    }
  }
  return terms;
};

const parseSerializableFactorization = (value: unknown): RationalPrimeFactorization | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const maybe = value as Record<string, unknown>;
  const sign = maybe.sign;
  if (sign !== -1 && sign !== 1) {
    return undefined;
  }
  const numerator = parsePrimeFactorTerms(maybe.numerator);
  const denominator = parsePrimeFactorTerms(maybe.denominator);
  if (!numerator || !denominator) {
    return undefined;
  }
  return {
    sign,
    numerator,
    denominator,
  };
};

const isUnarySlotOperator = (value: string): value is UnarySlotOperator => isUnaryOperatorId(value as never);
const isBinarySlotOperator = (value: string): value is BinarySlotOperator => isBinaryOperatorKeyId(value as never);

const toSerializableState = (state: GameState): SerializableStateLatest => {
  const lambdaControl = withLegacyAllocatorFallback(state.lambdaControl, state.allocator);
  return ({
  calculator: {
    total: serializeCalculatorValue(state.calculator.total),
    ...(state.calculator.seedSnapshot ? { seedSnapshot: serializeCalculatorValue(state.calculator.seedSnapshot) } : {}),
    pendingNegativeTotal: state.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: state.calculator.singleDigitInitialTotalEntry,
    rollEntries: state.calculator.rollEntries.map((entry) => ({
      y: serializeCalculatorValue(entry.y),
      ...(entry.remainder ? { remainder: toDisplayString(entry.remainder) } : {}),
      ...(entry.error ? { error: { ...entry.error, rollIndex: 0 } } : {}),
      ...(entry.symbolic
        ? {
            symbolic: {
              exprText: entry.symbolic.exprText,
              truncated: entry.symbolic.truncated,
              renderText: entry.symbolic.renderText,
            },
          }
        : {}),
      ...(entry.factorization ? { factorization: serializeFactorization(entry.factorization) } : {}),
    })),
    operationSlots: state.calculator.operationSlots.map<SerializableSlot>((slot) => ({
      kind: slot.kind,
      operator: slot.operator,
      ...(slot.kind === "binary"
        ? { operand: typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slot.operand) }
        : {}),
    })),
    draftingSlot: state.calculator.draftingSlot,
  },
  ui: {
    keyLayout: state.ui.keyLayout,
    keypadCells: state.ui.keypadCells,
    storageLayout: state.ui.storageLayout,
    keypadColumns: state.ui.keypadColumns,
    keypadRows: state.ui.keypadRows,
    activeVisualizer: state.ui.activeVisualizer,
    memoryVariable: state.ui.memoryVariable,
    buttonFlags: state.ui.buttonFlags,
  },
  keyPressCounts: state.keyPressCounts,
  allocatorReturnPressCount: state.allocatorReturnPressCount ?? 0,
  allocatorAllocatePressCount: state.allocatorAllocatePressCount ?? 0,
  unlocks: state.unlocks,
  completedUnlockIds: state.completedUnlockIds,
  allocator: buildAllocatorSnapshot(lambdaControl),
  lambdaControl: {
    maxPoints: lambdaControl.maxPoints,
    alpha: lambdaControl.alpha,
    beta: lambdaControl.beta,
    gamma: lambdaControl.gamma,
    overrides: {
      ...(lambdaControl.overrides.delta !== undefined ? { delta: lambdaControl.overrides.delta } : {}),
      ...(lambdaControl.overrides.epsilon
        ? { epsilon: toDisplayString(lambdaControl.overrides.epsilon) }
        : {}),
    },
  },
});
};

const fromSerializableStateV3 = (payloadState: SerializableStateLatest): GameState => {
  const lambdaInput = payloadState.lambdaControl
    ? {
        maxPoints: payloadState.lambdaControl.maxPoints,
        alpha: payloadState.lambdaControl.alpha,
        beta: payloadState.lambdaControl.beta,
        gamma: payloadState.lambdaControl.gamma,
        overrides: {
          ...(payloadState.lambdaControl.overrides?.delta !== undefined
            ? { delta: payloadState.lambdaControl.overrides.delta }
            : {}),
          ...(payloadState.lambdaControl.overrides?.epsilon
            ? { epsilon: parseRational(payloadState.lambdaControl.overrides.epsilon) }
            : {}),
        },
      }
    : createDefaultLambdaControl();
  const lambdaControl = sanitizeLambdaControl(lambdaInput);
  return {
    calculator: {
    total: deserializeCalculatorValue(payloadState.calculator.total),
    seedSnapshot: payloadState.calculator.seedSnapshot
      ? deserializeCalculatorValue(payloadState.calculator.seedSnapshot)
      : undefined,
    pendingNegativeTotal: payloadState.calculator.pendingNegativeTotal,
    singleDigitInitialTotalEntry: payloadState.calculator.singleDigitInitialTotalEntry ?? false,
    rollEntries: payloadState.calculator.rollEntries.map((entry) => {
      const y = deserializeCalculatorValue(entry.y);
      const serializedFactorization = parseSerializableFactorization((entry as Record<string, unknown>).factorization);
      const factorization = serializedFactorization ?? getRollYPrimeFactorization(y);
      return {
        y,
        ...(entry.remainder ? { remainder: parseRational(entry.remainder) } : {}),
        ...(entry.error ? { error: { code: entry.error.code, kind: entry.error.kind } } : {}),
        ...(entry.symbolic
          ? {
              symbolic: {
                exprText: entry.symbolic.exprText,
                truncated: entry.symbolic.truncated,
                renderText: entry.symbolic.renderText,
              },
            }
          : {}),
        ...(factorization ? { factorization } : {}),
      };
    }),
    operationSlots: payloadState.calculator.operationSlots.map((slot) => {
      if (slot.kind === "unary" && isUnarySlotOperator(slot.operator)) {
        return {
          kind: "unary" as const,
          operator: slot.operator,
        };
      }
      const operator = isBinarySlotOperator(slot.operator) ? slot.operator : KEY_ID.op_add;
      const operandText = slot.operand ?? "0";
      return {
        kind: "binary" as const,
        operator,
        operand: (() => {
          const expression = parseExpressionOrThrow(operandText);
          if (expression.type === "int_literal") {
            return expression.value;
          }
          return expression;
        })(),
      };
    }),
    draftingSlot: payloadState.calculator.draftingSlot,
  },
  ui: {
    keyLayout: payloadState.ui.keyLayout,
    keypadCells:
      payloadState.ui.keypadCells && payloadState.ui.keypadCells.length === payloadState.ui.keypadColumns * payloadState.ui.keypadRows
        ? payloadState.ui.keypadCells
        : fromKeyLayoutArray(
            payloadState.ui.keyLayout,
            payloadState.ui.keypadColumns,
            payloadState.ui.keypadRows,
          ),
    storageLayout: payloadState.ui.storageLayout,
    keypadColumns: payloadState.ui.keypadColumns,
    keypadRows: payloadState.ui.keypadRows,
    activeVisualizer: payloadState.ui.activeVisualizer,
    memoryVariable: payloadState.ui.memoryVariable ?? "α",
    buttonFlags: payloadState.ui.buttonFlags,
  },
  keyPressCounts: payloadState.keyPressCounts ?? {},
    allocatorReturnPressCount: payloadState.allocatorReturnPressCount ?? 0,
    allocatorAllocatePressCount: payloadState.allocatorAllocatePressCount ?? 0,
    unlocks: payloadState.unlocks,
    completedUnlockIds: payloadState.completedUnlockIds,
    lambdaControl,
    allocator: buildAllocatorSnapshot(lambdaControl),
  };
};

const parsePayloadEnvelope = (
  raw: string,
): { payload: SavePayload | null; reason: LoadFailureReason.InvalidJson | LoadFailureReason.InvalidPayloadEnvelope | null } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { payload: null, reason: LoadFailureReason.InvalidJson };
  }

  if (!isObject(parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }
  if (!("schemaVersion" in parsed) || !("state" in parsed)) {
    return { payload: null, reason: LoadFailureReason.InvalidPayloadEnvelope };
  }

  return {
    payload: {
      schemaVersion: parsed.schemaVersion as number,
      savedAt: (parsed.savedAt as number | undefined) ?? Date.now(),
      state: parsed.state,
    },
    reason: null,
  };
};

export const loadFromRawSave = (raw: string | null): LoadResult => {
  if (!raw) {
    return { state: null, reason: LoadFailureReason.MissingSave };
  }

  const parsedEnvelope = parsePayloadEnvelope(raw);
  if (!parsedEnvelope.payload) {
    return { state: null, reason: parsedEnvelope.reason };
  }
  const payload = parsedEnvelope.payload;

  if (!isValidSchemaVersion(payload.schemaVersion)) {
    return { state: null, reason: LoadFailureReason.UnsupportedSchemaVersion };
  }

  const migrated = migrateToLatest(payload.schemaVersion, payload.state);
  if (!migrated) {
    return { state: null, reason: LoadFailureReason.MigrationFailed };
  }

  try {
    return { state: fromSerializableStateV3(migrated), reason: null };
  } catch {
    return { state: null, reason: LoadFailureReason.DeserializeFailed };
  }
};

export const createLocalStorageRepo = (storage: KeyValueStorage) => ({
  load: (): GameState | null => loadFromRawSave(storage.getItem(SAVE_KEY)).state,

  save: (state: GameState): void => {
    const payload = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: toSerializableState(state),
    };
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
  },

  clear: (): void => {
    storage.removeItem(SAVE_KEY);
  },
});

