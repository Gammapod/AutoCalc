import type { AlgebraicBasis, AlgebraicValue, GameState, ScalarValue } from "../../domain/types.js";

const ALGEBRAIC_BASIS_ORDER: readonly AlgebraicBasis[] = ["one", "sqrt2", "sqrt3", "sqrt6"];

const stringifyForDebug = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) => (typeof entry === "bigint" ? entry.toString() : entry));

const serializeRationalForDebug = (value: { num: bigint; den: bigint }): { num: string; den: string } => ({
  num: value.num.toString(),
  den: value.den.toString(),
});

const serializeAlgebraicForDebug = (value: AlgebraicValue): Partial<Record<AlgebraicBasis, { num: string; den: string }>> => {
  const serialized: Partial<Record<AlgebraicBasis, { num: string; den: string }>> = {};
  for (const basis of ALGEBRAIC_BASIS_ORDER) {
    const coefficient = value[basis];
    if (coefficient) {
      serialized[basis] = serializeRationalForDebug(coefficient);
    }
  }
  return serialized;
};

const serializeScalarForDebug = (value: ScalarValue):
  | { kind: "rational"; value: { num: string; den: string } }
  | { kind: "alg"; value: Partial<Record<AlgebraicBasis, { num: string; den: string }>> }
  | { kind: "expr"; value: string } =>
  value.kind === "rational"
    ? { kind: "rational", value: serializeRationalForDebug(value.value) }
    : value.kind === "alg"
      ? { kind: "alg", value: serializeAlgebraicForDebug(value.value) }
      : { kind: "expr", value: stringifyForDebug(value.value) };

const serializeCalculatorValueForDebug = (value: GameState["calculator"]["total"]):
  | { kind: "nan" }
  | { kind: "rational"; value: { num: string; den: string } }
  | { kind: "expr"; value: string }
  | { kind: "complex"; value: { re: ReturnType<typeof serializeScalarForDebug>; im: ReturnType<typeof serializeScalarForDebug> } } =>
  value.kind === "nan"
    ? { kind: "nan" }
    : value.kind === "rational"
      ? { kind: "rational", value: serializeRationalForDebug(value.value) }
      : value.kind === "expr"
        ? { kind: "expr", value: stringifyForDebug(value.value) }
        : {
            kind: "complex",
            value: {
              re: serializeScalarForDebug(value.value.re),
              im: serializeScalarForDebug(value.value.im),
            },
          };

export const serializeRollEntriesForDebug = (state: GameState): unknown[] =>
  state.calculator.rollEntries.map((entry, index) => ({
    x: index,
    y: serializeCalculatorValueForDebug(entry.y),
    ...(entry.error ? { error: entry.error } : {}),
    d1: entry.d1 ? serializeRationalForDebug(entry.d1) : null,
    d2: entry.d2 ? serializeRationalForDebug(entry.d2) : null,
    r1: entry.r1 ? serializeRationalForDebug(entry.r1) : null,
    seedMinus1Y: entry.seedMinus1Y ? serializeCalculatorValueForDebug(entry.seedMinus1Y) : null,
    seedPlus1Y: entry.seedPlus1Y ? serializeCalculatorValueForDebug(entry.seedPlus1Y) : null,
  }));
