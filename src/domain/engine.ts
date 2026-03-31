import { addInt, divInt, mulInt, subInt } from "../infra/math/rationalEngine.js";
import { euclideanDivide } from "../infra/math/euclideanEngine.js";
import { parseSimplifiedTextToExactRational, simplifyExpressionToText } from "../infra/math/symbolicAdapter.js";
import {
  calculatorValueToExpression,
  isComplexCalculatorValue,
  isRationalCalculatorValue,
  scalarValueToCalculatorValue,
  toExplicitComplexCalculatorValue,
  toComplexCalculatorValue,
  toExpressionCalculatorValue,
  toExpressionScalarValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
  toScalarValue,
} from "./calculatorValue.js";
import {
  expressionToAlgebriteString,
  expressionToDisplayString,
  expressionToRational,
  intExpr,
  normalizeExpression,
  slotOperandToExpression,
} from "./expression.js";
import type { BinarySlotOperator, CalculatorValue, ExpressionValue, RationalValue, ScalarValue, Slot } from "./types.js";
import { isUnsupportedSymbolicOperatorKeyId, KEY_ID, resolveKeyId } from "./keyPresentation.js";

export type ExecuteSlotsResult =
  | { ok: true; total: RationalValue; euclidRemainder?: RationalValue }
  | { ok: false; reason: "division_by_zero" | "nan_input" | "unsupported_symbolic" };

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const gcdBigInt = (left: bigint, right: bigint): bigint => {
  let a = absBigInt(left);
  let b = absBigInt(right);
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
};

const lcmBigInt = (left: bigint, right: bigint): bigint => {
  const a = absBigInt(left);
  const b = absBigInt(right);
  if (a === 0n || b === 0n) {
    return 0n;
  }
  return (a / gcdBigInt(a, b)) * b;
};

const normalizeRational = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    throw new Error("Invalid rational denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  const num = value.num * sign;
  const den = value.den * sign;
  const divisor = gcdBigInt(num, den);
  return { num: num / divisor, den: den / divisor };
};

const multiplyRational = (left: RationalValue, right: RationalValue): RationalValue =>
  normalizeRational({ num: left.num * right.num, den: left.den * right.den });

const invertRational = (value: RationalValue): RationalValue => {
  if (value.num === 0n) {
    throw new Error("Division by zero.");
  }
  return normalizeRational({ num: value.den, den: value.num });
};

const powRationalInt = (base: RationalValue, exponent: bigint): RationalValue => {
  if (exponent === 0n) {
    return { num: 1n, den: 1n };
  }
  if (exponent < 0n) {
    return powRationalInt(invertRational(base), -exponent);
  }
  let result: RationalValue = { num: 1n, den: 1n };
  let factor = normalizeRational(base);
  let power = exponent;
  while (power > 0n) {
    if ((power & 1n) === 1n) {
      result = multiplyRational(result, factor);
    }
    power >>= 1n;
    if (power > 0n) {
      factor = multiplyRational(factor, factor);
    }
  }
  return result;
};

const floorDiv = (num: bigint, den: bigint): bigint => {
  const q = num / den;
  const r = num % den;
  return r !== 0n && ((num < 0n) !== (den < 0n)) ? q - 1n : q;
};

const ceilDiv = (num: bigint, den: bigint): bigint => {
  const q = num / den;
  const r = num % den;
  return r !== 0n && ((num < 0n) === (den < 0n)) ? q + 1n : q;
};

const rotateLeftDigits = (value: bigint, amount: bigint): bigint => {
  const sign = value < 0n ? -1n : 1n;
  const digits = absBigInt(value).toString();
  const length = BigInt(digits.length);
  if (length <= 1n) {
    return value;
  }
  const normalized = Number((((amount % length) + length) % length));
  if (normalized === 0) {
    return value;
  }
  const rotated = `${digits.slice(normalized)}${digits.slice(0, normalized)}`;
  const magnitude = BigInt(rotated);
  return sign < 0n ? -magnitude : magnitude;
};

const factorCountWithMultiplicity = (value: bigint): bigint => {
  let remaining = absBigInt(value);
  if (remaining < 2n) {
    return 0n;
  }
  let count = 0n;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    count += 1n;
  }
  let candidate = 3n;
  while (candidate * candidate <= remaining) {
    while (remaining % candidate === 0n) {
      remaining /= candidate;
      count += 1n;
    }
    candidate += 2n;
  }
  if (remaining > 1n) {
    count += 1n;
  }
  return count;
};

const sortDigitsAscending = (value: bigint): bigint => {
  const sign = value < 0n ? -1n : 1n;
  const digits = absBigInt(value).toString().split("").sort().join("");
  const sorted = BigInt(digits);
  return sign < 0n ? -sorted : sorted;
};

const reverseDigits = (value: bigint): bigint => {
  const sign = value < 0n ? -1n : 1n;
  const digits = absBigInt(value).toString().split("").reverse().join("");
  const reversed = BigInt(digits);
  return sign < 0n ? -reversed : reversed;
};

const phiBigInt = (value: bigint): bigint => {
  let remaining = absBigInt(value);
  let result = remaining;
  if (remaining < 2n) {
    return remaining;
  }
  if (remaining % 2n === 0n) {
    while (remaining % 2n === 0n) {
      remaining /= 2n;
    }
    result -= result / 2n;
  }
  let candidate = 3n;
  while (candidate * candidate <= remaining) {
    if (remaining % candidate === 0n) {
      while (remaining % candidate === 0n) {
        remaining /= candidate;
      }
      result -= result / candidate;
    }
    candidate += 2n;
  }
  if (remaining > 1n) {
    result -= result / remaining;
  }
  return result;
};

const sigmaBigInt = (value: bigint): bigint => {
  const target = absBigInt(value);
  if (target < 1n) {
    return 0n;
  }
  let remaining = target;
  let result = 1n;

  let exponent = 0n;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    exponent += 1n;
  }
  if (exponent > 0n) {
    result *= ((2n ** (exponent + 1n)) - 1n) / (2n - 1n);
  }

  let candidate = 3n;
  while (candidate * candidate <= remaining) {
    exponent = 0n;
    while (remaining % candidate === 0n) {
      remaining /= candidate;
      exponent += 1n;
    }
    if (exponent > 0n) {
      result *= ((candidate ** (exponent + 1n)) - 1n) / (candidate - 1n);
    }
    candidate += 2n;
  }

  if (remaining > 1n) {
    result *= ((remaining ** 2n) - 1n) / (remaining - 1n);
  }
  return result;
};

export const executeSlots = (total: RationalValue, slots: Slot[]): ExecuteSlotsResult => {
  if (slots.length === 0) {
    return { ok: true, total };
  }

  let nextTotal = total;
  let lastEuclidModComponent: RationalValue | undefined;
  let endsWithEuclidLikeOperator = false;

  for (const slot of slots) {
    if (slot.kind === "unary") {
      if (resolveKeyId(slot.operator) === KEY_ID.unary_inc) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = addInt(nextTotal, 1n);
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_dec) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = subInt(nextTotal, 1n);
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_neg) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = mulInt(nextTotal, -1n);
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_sigma) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        if (nextTotal.num === 0n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: sigmaBigInt(nextTotal.num), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_phi) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        if (nextTotal.num === 0n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: phiBigInt(nextTotal.num), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_omega) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        if (nextTotal.num === 0n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: factorCountWithMultiplicity(nextTotal.num), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_not) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: nextTotal.num <= 0n ? 1n : 0n, den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_collatz) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = nextTotal.num % 2n === 0n
          ? { num: nextTotal.num / 2n, den: 1n }
          : { num: (3n * nextTotal.num) + 1n, den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_sort_asc) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: sortDigitsAscending(nextTotal.num), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_floor) {
        nextTotal = { num: floorDiv(nextTotal.num, nextTotal.den), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_ceil) {
        nextTotal = { num: ceilDiv(nextTotal.num, nextTotal.den), den: 1n };
      } else if (resolveKeyId(slot.operator) === KEY_ID.unary_mirror_digits) {
        if (nextTotal.den !== 1n) {
          return { ok: false, reason: "nan_input" };
        }
        nextTotal = { num: reverseDigits(nextTotal.num), den: 1n };
      } else {
        return { ok: false, reason: "unsupported_symbolic" };
      }
      endsWithEuclidLikeOperator = false;
      continue;
    }

    if (typeof slot.operand !== "bigint") {
      return { ok: false, reason: "unsupported_symbolic" };
    }

    if (resolveKeyId(slot.operator) === KEY_ID.op_add) {
      nextTotal = addInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_sub) {
      nextTotal = subInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_mul) {
      nextTotal = mulInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_pow) {
      try {
        nextTotal = powRationalInt(nextTotal, slot.operand);
      } catch {
        return { ok: false, reason: "division_by_zero" };
      }
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_div) {
      if (slot.operand === 0n) {
        return { ok: false, reason: "division_by_zero" };
      }
      nextTotal = divInt(nextTotal, slot.operand);
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_euclid_div) {
      const euclidean = euclideanDivide(nextTotal, slot.operand);
      if (!euclidean.ok) {
        return euclidean;
      }
      nextTotal = euclidean.quotient;
      lastEuclidModComponent = euclidean.remainder;
      endsWithEuclidLikeOperator = true;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_mod) {
      const euclidean = euclideanDivide(nextTotal, slot.operand);
      if (!euclidean.ok) {
        return euclidean;
      }
      nextTotal = euclidean.remainder;
      lastEuclidModComponent = euclidean.remainder;
      endsWithEuclidLikeOperator = true;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_rotate_left) {
      if (nextTotal.den !== 1n) {
        return { ok: false, reason: "nan_input" };
      }
      nextTotal = { num: rotateLeftDigits(nextTotal.num, slot.operand), den: 1n };
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_gcd) {
      if (nextTotal.den !== 1n) {
        return { ok: false, reason: "nan_input" };
      }
      nextTotal = { num: gcdBigInt(nextTotal.num, slot.operand), den: 1n };
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_lcm) {
      if (nextTotal.den !== 1n) {
        return { ok: false, reason: "nan_input" };
      }
      nextTotal = { num: lcmBigInt(nextTotal.num, slot.operand), den: 1n };
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_max) {
      const leftScaled = nextTotal.num;
      const rightScaled = slot.operand * nextTotal.den;
      nextTotal = leftScaled >= rightScaled ? nextTotal : { num: slot.operand, den: 1n };
      endsWithEuclidLikeOperator = false;
      continue;
    }
    if (resolveKeyId(slot.operator) === KEY_ID.op_min) {
      const leftScaled = nextTotal.num;
      const rightScaled = slot.operand * nextTotal.den;
      nextTotal = leftScaled <= rightScaled ? nextTotal : { num: slot.operand, den: 1n };
      endsWithEuclidLikeOperator = false;
      continue;
    }
    throw new Error(`Unsupported operator: ${slot.operator}`);
  }

  if (endsWithEuclidLikeOperator && lastEuclidModComponent) {
    return { ok: true, total: nextTotal, euclidRemainder: lastEuclidModComponent };
  }
  return { ok: true, total: nextTotal };
};

const applyBinaryExpression = (
  left: ExpressionValue,
  operator: BinarySlotOperator,
  right: ExpressionValue,
): ExpressionValue | null => {
  if (resolveKeyId(operator) === KEY_ID.op_add) {
    return normalizeExpression({ type: "binary", op: "add", left, right });
  }
  if (resolveKeyId(operator) === KEY_ID.op_sub) {
    return normalizeExpression({ type: "binary", op: "sub", left, right });
  }
  if (resolveKeyId(operator) === KEY_ID.op_mul) {
    return normalizeExpression({ type: "binary", op: "mul", left, right });
  }
  if (resolveKeyId(operator) === KEY_ID.op_div) {
    return normalizeExpression({ type: "binary", op: "div", left, right });
  }
  return null;
};

const applyBinaryExpressionRaw = (
  left: ExpressionValue,
  operator: BinarySlotOperator,
  right: ExpressionValue,
): ExpressionValue | null => {
  if (resolveKeyId(operator) === KEY_ID.op_add) {
    return { type: "binary", op: "add", left, right };
  }
  if (resolveKeyId(operator) === KEY_ID.op_sub) {
    return { type: "binary", op: "sub", left, right };
  }
  if (resolveKeyId(operator) === KEY_ID.op_mul) {
    return { type: "binary", op: "mul", left, right };
  }
  if (resolveKeyId(operator) === KEY_ID.op_div) {
    return { type: "binary", op: "div", left, right };
  }
  return null;
};

export type ExecuteSlotsValueResult =
  | { ok: true; total: CalculatorValue; euclidRemainder?: RationalValue }
  | { ok: false; reason: "division_by_zero" | "nan_input" | "unsupported_symbolic" };

export type BuildSymbolicExpressionResult =
  | { ok: true; expression: ExpressionValue }
  | { ok: false; reason: "nan_input" | "unsupported_symbolic" };

export const buildSymbolicExpression = (total: CalculatorValue, slots: Slot[]): BuildSymbolicExpressionResult => {
  if (total.kind === "nan") {
    return { ok: false, reason: "nan_input" };
  }
  let currentExpression = calculatorValueToExpression(total);
  if (!currentExpression) {
    return { ok: false, reason: "nan_input" };
  }
  for (const slot of slots) {
    if (!("operand" in slot)) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    if (isUnsupportedSymbolicOperatorKeyId(slot.operator)) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    const right = typeof slot.operand === "bigint" ? intExpr(slot.operand) : slotOperandToExpression(slot.operand);
    const applied = applyBinaryExpressionRaw(currentExpression, slot.operator, right);
    if (!applied) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    currentExpression = applied;
  }
  return { ok: true, expression: currentExpression };
};

export type SymbolicEvaluation = {
  simplifiedText: string;
  isExactRational: boolean;
  rationalValue?: RationalValue;
};

export type SymbolicEvaluationError = {
  reason: "cas_error" | "non_rational" | "unsupported_expression";
};

export type EvaluateSymbolicExpressionResult =
  | { ok: true; value: SymbolicEvaluation }
  | { ok: false; error: SymbolicEvaluationError; simplifiedText: string };

export const evaluateSymbolicExpression = (expression: ExpressionValue): EvaluateSymbolicExpressionResult => {
  const simplified = simplifyExpressionToText(expression);
  if (!simplified.ok) {
    return {
      ok: false,
      error: { reason: simplified.reason },
      simplifiedText: expressionToDisplayString(expression),
    };
  }
  const rationalValue = parseSimplifiedTextToExactRational(simplified.text);
  if (!rationalValue) {
    return {
      ok: false,
      error: { reason: "non_rational" },
      simplifiedText: simplified.text,
    };
  }
  return {
    ok: true,
    value: {
      simplifiedText: simplified.text,
      isExactRational: true,
      rationalValue,
    },
  };
};

export const executeSlotsValue = (total: CalculatorValue, slots: Slot[]): ExecuteSlotsValueResult => {
  if (total.kind === "nan") {
    return { ok: false, reason: "nan_input" };
  }
  if (slots.length === 0) {
    return { ok: true, total };
  }

  type RuntimeValue = Exclude<CalculatorValue, { kind: "nan" }>;
  type ComplexRuntime = { re: ScalarValue; im: ScalarValue };
  const ZERO_RATIONAL = { num: 0n, den: 1n };
  const ONE_RATIONAL = { num: 1n, den: 1n };
  const COMPARISON_EPSILON = 1e-12;

  const scalarToExpression = (value: ScalarValue): ExpressionValue =>
    value.kind === "rational"
      ? (value.value.den === 1n ? intExpr(value.value.num) : { type: "rational_literal", value: value.value })
      : value.value;

  const scalarFromExpression = (value: ExpressionValue): ScalarValue =>
    toExpressionScalarValue(normalizeExpression(value));

  const scalarZero = (): ScalarValue => toRationalScalarValue(ZERO_RATIONAL);
  const scalarOne = (): ScalarValue => toRationalScalarValue(ONE_RATIONAL);
  const isScalarZero = (value: ScalarValue): boolean => {
    if (value.kind === "rational") {
      return value.value.num === 0n;
    }
    const resolved = expressionToRational(value.value);
    return Boolean(resolved && resolved.num === 0n);
  };

  const scalarToRational = (value: ScalarValue): RationalValue | null => {
    if (value.kind === "rational") {
      return value.value;
    }
    return expressionToRational(value.value);
  };

  const scalarToIntegerBigInt = (value: ScalarValue): bigint | null => {
    const resolved = scalarToRational(value);
    if (!resolved || resolved.den !== 1n) {
      return null;
    }
    return resolved.num;
  };

  const negateScalar = (value: ScalarValue): ScalarValue =>
    value.kind === "rational"
      ? toRationalScalarValue({ num: -value.value.num, den: value.value.den })
      : scalarFromExpression({ type: "unary", op: "neg", arg: value.value });

  const addScalar = (left: ScalarValue, right: ScalarValue): ScalarValue => {
    if (left.kind === "rational" && right.kind === "rational") {
      return toRationalScalarValue(normalizeRational({
        num: left.value.num * right.value.den + right.value.num * left.value.den,
        den: left.value.den * right.value.den,
      }));
    }
    return scalarFromExpression(normalizeExpression({
      type: "binary",
      op: "add",
      left: scalarToExpression(left),
      right: scalarToExpression(right),
    }));
  };

  const subScalar = (left: ScalarValue, right: ScalarValue): ScalarValue => addScalar(left, negateScalar(right));

  const mulScalar = (left: ScalarValue, right: ScalarValue): ScalarValue => {
    if (left.kind === "rational" && right.kind === "rational") {
      return toRationalScalarValue(normalizeRational({
        num: left.value.num * right.value.num,
        den: left.value.den * right.value.den,
      }));
    }
    return scalarFromExpression(normalizeExpression({
      type: "binary",
      op: "mul",
      left: scalarToExpression(left),
      right: scalarToExpression(right),
    }));
  };

  const divScalar = (left: ScalarValue, right: ScalarValue): ScalarValue | null => {
    if (right.kind === "rational" && right.value.num === 0n) {
      return null;
    }
    if (left.kind === "rational" && right.kind === "rational") {
      return toRationalScalarValue(normalizeRational({
        num: left.value.num * right.value.den,
        den: left.value.den * right.value.num,
      }));
    }
    return scalarFromExpression(normalizeExpression({
      type: "binary",
      op: "div",
      left: scalarToExpression(left),
      right: scalarToExpression(right),
    }));
  };

  const toComplexRuntime = (value: RuntimeValue): ComplexRuntime =>
    isComplexCalculatorValue(value)
      ? value.value
      : { re: toScalarValue(value), im: scalarZero() };

  const fromComplexRuntime = (value: ComplexRuntime): RuntimeValue =>
    toComplexCalculatorValue(value.re, value.im);

  const asGaussianInteger = (value: RuntimeValue): { re: bigint; im: bigint } | null => {
    if (value.kind !== "complex") {
      return null;
    }
    const re = scalarToIntegerBigInt(value.value.re);
    const im = scalarToIntegerBigInt(value.value.im);
    if (re === null || im === null || im === 0n) {
      return null;
    }
    return { re, im };
  };

  const gaussianNorm = (value: { re: bigint; im: bigint }): bigint => (value.re * value.re) + (value.im * value.im);

  const asPureRealRational = (value: RuntimeValue): RationalValue | null => {
    if (value.kind === "rational") {
      return value.value;
    }
    if (value.kind !== "complex") {
      return null;
    }
    if (!isScalarZero(value.value.im) || value.value.re.kind !== "rational") {
      return null;
    }
    return value.value.re.value;
  };

  const binaryRightToScalar = (slot: Extract<Slot, { kind?: "binary" }>): ScalarValue =>
    typeof slot.operand === "bigint"
      ? toRationalScalarValue({ num: slot.operand, den: 1n })
      : scalarFromExpression(slotOperandToExpression(slot.operand));

  const toApproximateNumber = (value: ScalarValue): number | null => {
    const resolved = scalarToRational(value);
    if (resolved) {
      return Number(resolved.num) / Number(resolved.den);
    }
    if (value.kind !== "expr") {
      return null;
    }
    const evaluateExpression = (expr: ExpressionValue): number | null => {
      const rational = expressionToRational(expr);
      if (rational) {
        return Number(rational.num) / Number(rational.den);
      }
      if (expr.type === "constant") {
        return expr.value === "pi" ? Math.PI : Math.E;
      }
      if (expr.type === "symbolic") {
        const symbolic = expr.text.trim().toLowerCase();
        if (symbolic === "pi") {
          return Math.PI;
        }
        if (symbolic === "e") {
          return Math.E;
        }
      }
      if (expr.type === "unary") {
        const arg = evaluateExpression(expr.arg);
        if (arg === null) {
          return null;
        }
        if (expr.op === "neg") {
          return -arg;
        }
        if (expr.op === "sqrt") {
          return Math.sqrt(arg);
        }
        if (expr.op === "ln") {
          return Math.log(arg);
        }
      }
      if (expr.type === "binary") {
        const left = evaluateExpression(expr.left);
        const right = evaluateExpression(expr.right);
        if (left === null || right === null) {
          return null;
        }
        if (expr.op === "add") {
          return left + right;
        }
        if (expr.op === "sub") {
          return left - right;
        }
        if (expr.op === "mul") {
          return left * right;
        }
        if (expr.op === "div") {
          return right === 0 ? null : left / right;
        }
      }
      const scope = globalThis as typeof globalThis & { Algebrite?: unknown };
      const algebriteAny = scope.Algebrite as
        | {
            float?: (input: string) => unknown;
            eval?: (input: string) => unknown;
            run?: (input: string) => unknown;
          }
        | undefined;
      if (!algebriteAny) {
        return null;
      }
      const input = expressionToAlgebriteString(expr);
      const runAndParse = (fn: ((input: string) => unknown) | undefined): number | null => {
        if (!fn) {
          return null;
        }
        try {
          const text = String(fn(input));
          const parsed = Number(text);
          return Number.isFinite(parsed) ? parsed : null;
        } catch {
          return null;
        }
      };
      return runAndParse(algebriteAny.float) ?? runAndParse(algebriteAny.eval) ?? runAndParse(algebriteAny.run);
    };
    return evaluateExpression(value.value);
  };

  const compareScalars = (left: ScalarValue, right: ScalarValue): -1 | 0 | 1 => {
    const leftExact = scalarToRational(left);
    const rightExact = scalarToRational(right);
    if (leftExact && rightExact) {
      const delta = leftExact.num * rightExact.den - rightExact.num * leftExact.den;
      if (delta > 0n) {
        return 1;
      }
      if (delta < 0n) {
        return -1;
      }
      return 0;
    }
    const leftApprox = toApproximateNumber(left);
    const rightApprox = toApproximateNumber(right);
    if (leftApprox === null || rightApprox === null) {
      return 0;
    }
    const delta = leftApprox - rightApprox;
    if (Math.abs(delta) <= COMPARISON_EPSILON) {
      return 0;
    }
    return delta > 0 ? 1 : -1;
  };

  const applyRationalOnlySlot = (current: RuntimeValue, slot: Slot): ExecuteSlotsValueResult => {
    const pureReal = asPureRealRational(current);
    if (!pureReal) {
      return { ok: false, reason: "nan_input" };
    }
    if (!("operand" in slot) && resolveKeyId(slot.operator) === KEY_ID.unary_i) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    const executed = executeSlots(pureReal, [slot]);
    if (!executed.ok) {
      return { ok: false, reason: executed.reason };
    }
    return {
      ok: true,
      total: toRationalCalculatorValue(executed.total),
      ...(executed.euclidRemainder ? { euclidRemainder: executed.euclidRemainder } : {}),
    };
  };

  const complexMultiply = (left: ComplexRuntime, right: ComplexRuntime): ComplexRuntime => ({
    re: subScalar(mulScalar(left.re, right.re), mulScalar(left.im, right.im)),
    im: addScalar(mulScalar(left.re, right.im), mulScalar(left.im, right.re)),
  });

  const complexInverse = (value: ComplexRuntime): ComplexRuntime | null => {
    const denominator = addScalar(mulScalar(value.re, value.re), mulScalar(value.im, value.im));
    if (isScalarZero(denominator)) {
      return null;
    }
    const re = divScalar(value.re, denominator);
    const im = divScalar(negateScalar(value.im), denominator);
    if (!re || !im) {
      return null;
    }
    return { re, im };
  };

  const complexPowInt = (base: ComplexRuntime, exponent: bigint): ComplexRuntime | null => {
    if (exponent === 0n) {
      return { re: scalarOne(), im: scalarZero() };
    }
    if (exponent < 0n) {
      const inverse = complexInverse(base);
      if (!inverse) {
        return null;
      }
      return complexPowInt(inverse, -exponent);
    }
    let result: ComplexRuntime = { re: scalarOne(), im: scalarZero() };
    let factor: ComplexRuntime = base;
    let power = exponent;
    while (power > 0n) {
      if ((power & 1n) === 1n) {
        result = complexMultiply(result, factor);
      }
      power >>= 1n;
      if (power > 0n) {
        factor = complexMultiply(factor, factor);
      }
    }
    return result;
  };

  let current: RuntimeValue = total;
  let lastEuclidRemainder: RationalValue | undefined;
  for (const slot of slots) {
    if (slot.kind === "unary") {
      const unaryKey = resolveKeyId(slot.operator);
      if (unaryKey === KEY_ID.unary_i) {
        const currentComplex = toComplexRuntime(current);
        current = toExplicitComplexCalculatorValue(negateScalar(currentComplex.im), currentComplex.re);
        continue;
      }
      if (unaryKey === KEY_ID.unary_inc || unaryKey === KEY_ID.unary_dec || unaryKey === KEY_ID.unary_neg) {
        const currentComplex = toComplexRuntime(current);
        const delta = unaryKey === KEY_ID.unary_inc
          ? toRationalScalarValue({ num: 1n, den: 1n })
          : toRationalScalarValue({ num: -1n, den: 1n });
        current = unaryKey === KEY_ID.unary_neg
          ? fromComplexRuntime({
            re: negateScalar(currentComplex.re),
            im: negateScalar(currentComplex.im),
          })
          : fromComplexRuntime({
            re: addScalar(currentComplex.re, delta),
            im: currentComplex.im,
          });
        lastEuclidRemainder = undefined;
        continue;
      }
      if (unaryKey === KEY_ID.unary_floor || unaryKey === KEY_ID.unary_ceil) {
        const currentComplex = toComplexRuntime(current);
        const re = scalarToRational(currentComplex.re);
        const im = scalarToRational(currentComplex.im);
        if (!re || !im) {
          return { ok: false, reason: "nan_input" };
        }
        current = fromComplexRuntime({
          re: toRationalScalarValue({
            num: unaryKey === KEY_ID.unary_floor ? floorDiv(re.num, re.den) : ceilDiv(re.num, re.den),
            den: 1n,
          }),
          im: toRationalScalarValue({
            num: unaryKey === KEY_ID.unary_floor ? floorDiv(im.num, im.den) : ceilDiv(im.num, im.den),
            den: 1n,
          }),
        });
        lastEuclidRemainder = undefined;
        continue;
      }
      if (unaryKey === KEY_ID.unary_not) {
        const currentComplex = toComplexRuntime(current);
        const compare = compareScalars(addScalar(currentComplex.re, currentComplex.im), scalarZero());
        current = toRationalCalculatorValue({ num: compare <= 0 ? 1n : 0n, den: 1n });
        lastEuclidRemainder = undefined;
        continue;
      }
      if (unaryKey === KEY_ID.unary_sigma || unaryKey === KEY_ID.unary_phi || unaryKey === KEY_ID.unary_omega) {
        const gaussian = asGaussianInteger(current);
        if (gaussian) {
          const norm = gaussianNorm(gaussian);
          if (norm === 0n) {
            return { ok: false, reason: "nan_input" };
          }
          current = unaryKey === KEY_ID.unary_sigma
            ? toRationalCalculatorValue({ num: sigmaBigInt(norm), den: 1n })
            : unaryKey === KEY_ID.unary_phi
              ? toRationalCalculatorValue({ num: phiBigInt(norm), den: 1n })
              : toRationalCalculatorValue({ num: factorCountWithMultiplicity(norm), den: 1n });
          lastEuclidRemainder = undefined;
          continue;
        }
      }
      if (unaryKey === KEY_ID.unary_collatz || unaryKey === KEY_ID.unary_sort_asc || unaryKey === KEY_ID.unary_mirror_digits) {
        const gaussian = asGaussianInteger(current);
        if (gaussian) {
          const mapInteger = (value: bigint): bigint => {
            if (unaryKey === KEY_ID.unary_collatz) {
              return value % 2n === 0n ? value / 2n : (3n * value) + 1n;
            }
            if (unaryKey === KEY_ID.unary_sort_asc) {
              return sortDigitsAscending(value);
            }
            return reverseDigits(value);
          };
          current = toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: mapInteger(gaussian.re), den: 1n }),
            toRationalScalarValue({ num: mapInteger(gaussian.im), den: 1n }),
          );
          lastEuclidRemainder = undefined;
          continue;
        }
      }
      const delegated = applyRationalOnlySlot(current, slot);
      if (!delegated.ok) {
        return delegated;
      }
      if (delegated.total.kind === "nan") {
        return { ok: false, reason: "nan_input" };
      }
      current = delegated.total;
      lastEuclidRemainder = delegated.euclidRemainder;
      continue;
    }

    const operatorKey = resolveKeyId(slot.operator);
    const supportsComplexArithmetic =
      operatorKey === KEY_ID.op_add
      || operatorKey === KEY_ID.op_sub
      || operatorKey === KEY_ID.op_mul
      || operatorKey === KEY_ID.op_div
      || operatorKey === KEY_ID.op_pow;
    const supportsDeferredComplexPolicy =
      operatorKey === KEY_ID.op_euclid_div
      || operatorKey === KEY_ID.op_mod
      || operatorKey === KEY_ID.op_rotate_left
      || operatorKey === KEY_ID.op_gcd
      || operatorKey === KEY_ID.op_lcm
      || operatorKey === KEY_ID.op_max
      || operatorKey === KEY_ID.op_min;

    if (!supportsComplexArithmetic && !supportsDeferredComplexPolicy) {
      const delegated = applyRationalOnlySlot(current, slot);
      if (!delegated.ok) {
        return delegated;
      }
      if (delegated.total.kind === "nan") {
        return { ok: false, reason: "nan_input" };
      }
      current = delegated.total;
      lastEuclidRemainder = delegated.euclidRemainder;
      continue;
    }

    if (supportsDeferredComplexPolicy) {
      if (operatorKey === KEY_ID.op_max || operatorKey === KEY_ID.op_min) {
        const left = toComplexRuntime(current);
        const right = binaryRightToScalar(slot);
        const leftMagnitudeSquared = addScalar(mulScalar(left.re, left.re), mulScalar(left.im, left.im));
        const rightMagnitudeSquared = mulScalar(right, right);
        const compare = compareScalars(leftMagnitudeSquared, rightMagnitudeSquared);
        const chooseLeft = operatorKey === KEY_ID.op_max ? compare >= 0 : compare <= 0;
        current = chooseLeft ? current : scalarValueToCalculatorValue(right);
        lastEuclidRemainder = undefined;
        continue;
      }

      const gaussian = asGaussianInteger(current);
      if (!gaussian) {
        const delegated = applyRationalOnlySlot(current, slot);
        if (!delegated.ok) {
          return delegated;
        }
        if (delegated.total.kind === "nan") {
          return { ok: false, reason: "nan_input" };
        }
        current = delegated.total;
        lastEuclidRemainder = delegated.euclidRemainder;
        continue;
      }

      if (typeof slot.operand !== "bigint") {
        return { ok: false, reason: "unsupported_symbolic" };
      }
      const norm = { num: gaussianNorm(gaussian), den: 1n };
      if (operatorKey === KEY_ID.op_euclid_div || operatorKey === KEY_ID.op_mod) {
        const euclidean = euclideanDivide(norm, slot.operand);
        if (!euclidean.ok) {
          return euclidean;
        }
        current = toRationalCalculatorValue(
          operatorKey === KEY_ID.op_euclid_div ? euclidean.quotient : euclidean.remainder,
        );
        lastEuclidRemainder = euclidean.remainder;
        continue;
      }
      if (operatorKey === KEY_ID.op_gcd) {
        current = toRationalCalculatorValue({ num: gcdBigInt(norm.num, slot.operand), den: 1n });
        lastEuclidRemainder = undefined;
        continue;
      }
      if (operatorKey === KEY_ID.op_lcm) {
        current = toRationalCalculatorValue({ num: lcmBigInt(norm.num, slot.operand), den: 1n });
        lastEuclidRemainder = undefined;
        continue;
      }
      if (operatorKey === KEY_ID.op_rotate_left) {
        current = toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: rotateLeftDigits(gaussian.re, slot.operand), den: 1n }),
          toRationalScalarValue({ num: rotateLeftDigits(gaussian.im, slot.operand), den: 1n }),
        );
        lastEuclidRemainder = undefined;
        continue;
      }
      return { ok: false, reason: "unsupported_symbolic" };
    }

    if (operatorKey === KEY_ID.op_pow && typeof slot.operand !== "bigint") {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    if (operatorKey !== KEY_ID.op_pow && isUnsupportedSymbolicOperatorKeyId(slot.operator)) {
      return { ok: false, reason: "unsupported_symbolic" };
    }

    const left = toComplexRuntime(current);
    const rightScalar = binaryRightToScalar(slot);
    const right: ComplexRuntime = { re: rightScalar, im: scalarZero() };
    if (operatorKey === KEY_ID.op_add) {
      current = fromComplexRuntime({
        re: addScalar(left.re, right.re),
        im: addScalar(left.im, right.im),
      });
      lastEuclidRemainder = undefined;
      continue;
    }
    if (operatorKey === KEY_ID.op_sub) {
      current = fromComplexRuntime({
        re: subScalar(left.re, right.re),
        im: subScalar(left.im, right.im),
      });
      lastEuclidRemainder = undefined;
      continue;
    }
    if (operatorKey === KEY_ID.op_mul) {
      current = fromComplexRuntime(complexMultiply(left, right));
      lastEuclidRemainder = undefined;
      continue;
    }
    if (operatorKey === KEY_ID.op_div) {
      const inverse = complexInverse(right);
      if (!inverse) {
        return { ok: false, reason: "division_by_zero" };
      }
      current = fromComplexRuntime(complexMultiply(left, inverse));
      lastEuclidRemainder = undefined;
      continue;
    }
    if (operatorKey === KEY_ID.op_pow) {
      const powOperand = slot.operand;
      if (typeof powOperand !== "bigint") {
        return { ok: false, reason: "unsupported_symbolic" };
      }
      const powered = complexPowInt(left, powOperand);
      if (!powered) {
        return { ok: false, reason: "division_by_zero" };
      }
      current = fromComplexRuntime(powered);
      lastEuclidRemainder = undefined;
      continue;
    }
    return { ok: false, reason: "unsupported_symbolic" };
  }

  return {
    ok: true,
    total: current,
    ...(lastEuclidRemainder ? { euclidRemainder: lastEuclidRemainder } : {}),
  };
};

