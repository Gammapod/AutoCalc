import type { GameState } from "../../domain/types.js";

const serializeRationalForDebug = (value: { num: bigint; den: bigint }): { num: string; den: string } => ({
  num: value.num.toString(),
  den: value.den.toString(),
});

const serializeCalculatorValueForDebug = (value: GameState["calculator"]["total"]):
  | { kind: "nan" }
  | { kind: "rational"; value: { num: string; den: string } }
  | { kind: "expr"; value: string }
  | { kind: "complex"; value: { re: { kind: "rational" | "expr"; value: unknown }; im: { kind: "rational" | "expr"; value: unknown } } } =>
  value.kind === "nan"
    ? { kind: "nan" }
    : value.kind === "rational"
      ? { kind: "rational", value: serializeRationalForDebug(value.value) }
      : value.kind === "expr"
        ? { kind: "expr", value: JSON.stringify(value.value) }
        : {
            kind: "complex",
            value: {
              re: value.value.re.kind === "rational"
                ? { kind: "rational", value: serializeRationalForDebug(value.value.re.value) }
                : { kind: "expr", value: JSON.stringify(value.value.re.value) },
              im: value.value.im.kind === "rational"
                ? { kind: "rational", value: serializeRationalForDebug(value.value.im.value) }
                : { kind: "expr", value: JSON.stringify(value.value.im.value) },
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
