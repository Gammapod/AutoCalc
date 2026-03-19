import { addInt, divInt, mulInt, subInt } from "../infra/math/rationalEngine.js";
import { euclideanDivide } from "../infra/math/euclideanEngine.js";
import { parseSimplifiedTextToExactRational, simplifyExpressionToText } from "../infra/math/symbolicAdapter.js";
import { calculatorValueToExpression, isRationalCalculatorValue, toExpressionCalculatorValue, toRationalCalculatorValue } from "./calculatorValue.js";
import { expressionToDisplayString, intExpr, normalizeExpression, slotOperandToExpression } from "./expression.js";
import type { BinarySlotOperator, CalculatorValue, ExpressionValue, RationalValue, Slot } from "./types.js";
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
        nextTotal = { num: nextTotal.num === 0n ? 1n : 0n, den: 1n };
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
    if (resolveKeyId(slot.operator) === KEY_ID.op_greater) {
      const leftScaled = nextTotal.num;
      const rightScaled = slot.operand * nextTotal.den;
      nextTotal = { num: leftScaled > rightScaled ? 1n : 0n, den: 1n };
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

  const canUsePureRationalPath =
    isRationalCalculatorValue(total)
    && slots.every((slot) => slot.kind === "unary" || typeof slot.operand === "bigint");
  if (canUsePureRationalPath) {
    const executed = executeSlots(total.value, slots);
    if (!executed.ok) {
      return { ok: false, reason: executed.reason };
    }
    return {
      ok: true,
      total: toRationalCalculatorValue(executed.total),
      ...(executed.euclidRemainder ? { euclidRemainder: executed.euclidRemainder } : {}),
    };
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
    const applied = applyBinaryExpression(currentExpression, slot.operator, right);
    if (!applied) {
      return { ok: false, reason: "unsupported_symbolic" };
    }
    currentExpression = applied;
  }

  return { ok: true, total: toExpressionCalculatorValue(currentExpression) };
};

