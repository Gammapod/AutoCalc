import type { GameState, Key, LayoutCell } from "./types.js";

export type NumberDomainReport = {
  naturalNumbers: boolean;
  integersNonNatural: boolean;
  generatedAtIso: string;
  reasoning: string[];
};

export type NumberDomainAnalysisOptions = {
  useAllUnlockedKeys?: boolean;
};

const formatPredicate = (name: string, value: boolean): string => `${name}=${value ? "true" : "false"}`;

const isKeyCell = (cell: LayoutCell): cell is { kind: "key"; key: Key } => cell.kind === "key";

const isUnlocked = (state: GameState, key: Key): boolean => {
  if (/^\d$/.test(key) || key === "NEG") {
    return state.unlocks.valueExpression[key as keyof GameState["unlocks"]["valueExpression"]];
  }
  if (key === "+" || key === "-" || key === "*" || key === "/" || key === "#" || key === "\u27E1") {
    return state.unlocks.slotOperators[key];
  }
  if (key === "C" || key === "CE" || key === "UNDO" || key === "GRAPH") {
    return state.unlocks.utilities[key];
  }
  if (key === "=" || key === "++" || key === "\u23EF") {
    return state.unlocks.execution[key];
  }
  return false;
};

export const analyzeNumberDomains = (
  state: GameState,
  now: Date = new Date(),
  options: NumberDomainAnalysisOptions = {},
): NumberDomainReport => {
  const useAllUnlockedKeys = options.useAllUnlockedKeys ?? false;
  const keypadKeys = new Set(state.ui.keyLayout.filter(isKeyCell).map((cell) => cell.key));
  const isAvailable = (key: Key): boolean => isUnlocked(state, key) && (useAllUnlockedKeys || keypadKeys.has(key));

  const canResetToZero = isAvailable("C") || isAvailable("UNDO");
  const hasDigitOne = isAvailable("1");
  const hasPlus = isAvailable("+");
  const hasMinus = isAvailable("-");
  const hasNeg = isAvailable("NEG");
  const hasEquals = isAvailable("=");

  const plusStep = isAvailable("++") || (hasEquals && hasPlus && hasDigitOne);
  const minusStep = (hasEquals && hasMinus && hasDigitOne) || (hasEquals && hasPlus && hasNeg && hasDigitOne);

  const currentIsInteger = state.calculator.total.den === 1n;
  const currentValue = currentIsInteger ? state.calculator.total.num : null;
  const anchorIntegerExists = currentIsInteger || canResetToZero;

  const canReachOne =
    (currentIsInteger && currentValue === 1n) ||
    (currentIsInteger && currentValue === 0n && plusStep) ||
    (canResetToZero && plusStep) ||
    (canResetToZero && hasDigitOne) ||
    (anchorIntegerExists && plusStep && minusStep);

  const canReachZero =
    (currentIsInteger && currentValue === 0n) || canResetToZero || (anchorIntegerExists && plusStep && minusStep);

  const naturalNumbers = canReachOne && plusStep;
  const integersNonNatural = canReachZero && minusStep;

  const reasoning: string[] = [
    `scope=${useAllUnlockedKeys ? "all_unlocked" : "present_on_keypad"}`,
    formatPredicate("canResetToZero", canResetToZero),
    formatPredicate("hasDigitOne", hasDigitOne),
    formatPredicate("plusStep", plusStep),
    formatPredicate("minusStep", minusStep),
    formatPredicate("currentIsInteger", currentIsInteger),
    formatPredicate("anchorIntegerExists", anchorIntegerExists),
    formatPredicate("canReachOne", canReachOne),
    formatPredicate("canReachZero", canReachZero),
  ];

  if (!naturalNumbers) {
    reasoning.push(
      `naturalNumbers=false (failed: ${formatPredicate("canReachOne", canReachOne)}, ${formatPredicate("plusStep", plusStep)})`,
    );
  } else {
    reasoning.push("naturalNumbers=true");
  }

  if (!integersNonNatural) {
    reasoning.push(
      `integersNonNatural=false (failed: ${formatPredicate("canReachZero", canReachZero)}, ${formatPredicate("minusStep", minusStep)})`,
    );
  } else {
    reasoning.push("integersNonNatural=true");
  }

  return {
    naturalNumbers,
    integersNonNatural,
    generatedAtIso: now.toISOString(),
    reasoning,
  };
};
