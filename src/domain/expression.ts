import { parseRational, toDisplayString } from "../infra/math/rationalEngine.js";
import { normalizeSymbolicText } from "./symbolicEngine.js";
import type { BinaryExprOp, ExpressionConstant, ExpressionValue, RationalValue, SlotOperand, UnaryExprOp } from "./types.js";

const INTEGER_RE = /^-?\d+$/;
const RATIONAL_RE = /^-?\d+\/-?\d+$/;

const OP_SYMBOL_BY_BINARY: Record<BinaryExprOp, "+" | "-" | "*" | "/"> = {
  add: "+",
  sub: "-",
  mul: "*",
  div: "/",
};

const OP_PREFIX_BY_UNARY: Record<UnaryExprOp, "(-" | "ln(" | "sqrt("> = {
  neg: "(-",
  ln: "ln(",
  sqrt: "sqrt(",
};

const normalizeConstant = (value: string): ExpressionConstant | null => {
  const compact = value.trim().toLowerCase();
  if (compact === "pi") {
    return "pi";
  }
  if (compact === "e") {
    return "e";
  }
  return null;
};

export const intExpr = (value: bigint): ExpressionValue => ({ type: "int_literal", value });

export const rationalExpr = (value: RationalValue): ExpressionValue =>
  value.den === 1n ? intExpr(value.num) : { type: "rational_literal", value };

export const constantExpr = (value: ExpressionConstant): ExpressionValue => ({ type: "constant", value });

export const symbolicExpr = (text: string): ExpressionValue => ({ type: "symbolic", text: normalizeSymbolicText(text) });

export const isExpressionInteger = (value: ExpressionValue): boolean =>
  value.type === "int_literal"
  || (value.type === "rational_literal" && value.value.den === 1n);

export const expressionToRational = (value: ExpressionValue): RationalValue | null => {
  if (value.type === "int_literal") {
    return { num: value.value, den: 1n };
  }
  if (value.type === "rational_literal") {
    return value.value;
  }
  return null;
};

export const expressionToAlgebriteString = (value: ExpressionValue): string => {
  if (value.type === "int_literal") {
    return value.value.toString();
  }
  if (value.type === "rational_literal") {
    return toDisplayString(value.value);
  }
  if (value.type === "constant") {
    return value.value;
  }
  if (value.type === "symbolic") {
    return value.text;
  }
  if (value.type === "unary") {
    const arg = expressionToAlgebriteString(value.arg);
    return `${OP_PREFIX_BY_UNARY[value.op]}${arg})`;
  }
  return `(${expressionToAlgebriteString(value.left)}${OP_SYMBOL_BY_BINARY[value.op]}${expressionToAlgebriteString(value.right)})`;
};

export const expressionToDisplayString = (value: ExpressionValue): string => expressionToAlgebriteString(value);

export const normalizeExpression = (value: ExpressionValue): ExpressionValue => {
  if (value.type === "int_literal" || value.type === "rational_literal" || value.type === "constant") {
    return value;
  }
  return symbolicExpr(expressionToAlgebriteString(value));
};

export const parseExpressionOrNull = (text: string): ExpressionValue | null => {
  const compact = text.trim().replace(/\s+/g, "");
  if (compact.length === 0) {
    return null;
  }
  const constant = normalizeConstant(compact);
  if (constant) {
    return constantExpr(constant);
  }
  if (INTEGER_RE.test(compact)) {
    return intExpr(BigInt(compact));
  }
  if (RATIONAL_RE.test(compact)) {
    return rationalExpr(parseRational(compact));
  }
  try {
    return symbolicExpr(compact);
  } catch {
    return null;
  }
};

export const parseExpressionOrThrow = (text: string): ExpressionValue => {
  const parsed = parseExpressionOrNull(text);
  if (!parsed) {
    throw new Error(`Unsupported expression: ${text}`);
  }
  return parsed;
};

export const slotOperandToExpression = (operand: SlotOperand): ExpressionValue =>
  typeof operand === "bigint" ? intExpr(operand) : operand;
