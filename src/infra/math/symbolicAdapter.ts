import { expressionToAlgebriteString } from "../../domain/expression.js";
import type { ExpressionValue, RationalValue } from "../../domain/types.js";
import { parseRational } from "./rationalEngine.js";

const INTEGER_RE = /^-?\d+$/;
const RATIONAL_RE = /^-?\d+\/-?\d+$/;

const stripOuterParens = (text: string): string => {
  let current = text.trim();
  while (current.startsWith("(") && current.endsWith(")")) {
    let depth = 0;
    let fullyWrapped = true;
    for (let index = 0; index < current.length; index += 1) {
      const char = current[index];
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0 && index < current.length - 1) {
          fullyWrapped = false;
          break;
        }
      }
      if (depth < 0) {
        return current;
      }
    }
    if (!fullyWrapped || depth !== 0) {
      return current;
    }
    current = current.slice(1, -1).trim();
  }
  return current;
};

const normalizeSimplifiedText = (text: string): string =>
  stripOuterParens(text.replace(/\s+/g, ""));

export type SimplifyExpressionToTextResult =
  | { ok: true; text: string }
  | { ok: false; reason: "cas_error" | "unsupported_expression" };

type AlgebriteLike = {
  simplify: (expression: string) => unknown;
};

const getAlgebriteApi = (): AlgebriteLike | null => {
  const scope = globalThis as typeof globalThis & { Algebrite?: AlgebriteLike };
  return scope.Algebrite ?? null;
};

export const simplifyExpressionToText = (expression: ExpressionValue): SimplifyExpressionToTextResult => {
  const algebrite = getAlgebriteApi();
  if (!algebrite) {
    return { ok: false, reason: "cas_error" };
  }
  try {
    const input = expressionToAlgebriteString(expression);
    const simplified = String(algebrite.simplify(input));
    const normalized = normalizeSimplifiedText(simplified);
    if (!normalized || normalized.includes(".")) {
      return { ok: false, reason: "unsupported_expression" };
    }
    return { ok: true, text: normalized };
  } catch {
    return { ok: false, reason: "cas_error" };
  }
};

export const parseSimplifiedTextToExactRational = (text: string): RationalValue | null => {
  const normalized = normalizeSimplifiedText(text);
  if (INTEGER_RE.test(normalized)) {
    return { num: BigInt(normalized), den: 1n };
  }
  if (!RATIONAL_RE.test(normalized)) {
    return null;
  }
  try {
    return parseRational(normalized);
  } catch {
    return null;
  }
};
