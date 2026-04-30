import { calculatorValueToDisplayString } from "../../domain/calculatorValue.js";
import { expressionToDisplayString, slotOperandToExpression } from "../../domain/expression.js";
import { resolveFormulaSymbol } from "../../domain/multiCalculator.js";
import { getSeedRow } from "../../domain/rollEntries.js";
import { KEY_ID } from "../../domain/keyPresentation.js";
import type {
  BinarySlot,
  CalculatorValue,
  GameState,
} from "../../domain/types.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";
import {
  algebraicHelpers,
  formatOperatorForOperationSlotDisplay,
  keyLabelInternals,
  resolveStepExpansionText,
} from "./readModel.keyLabels.js";

export type AlgebraicMainLineSource = "builder_unsimplified" | "roll_simplified" | "roll_literal";

export type AlgebraicViewModel = {
  seedLine: string;
  recurrenceLine: string;
  mainLine: string;
  mainLineSource: AlgebraicMainLineSource;
  hasIncompleteDraft: boolean;
  containsEuclidLiteral: boolean;
  recurrenceExpressionText: string;
  builderUxRole: UxRole;
  builderUxState: UxRoleState;
  equationUxRole: UxRole;
  equationUxState: UxRoleState;
  truncationUxRole: UxRole;
  truncationUxState: UxRoleState;
};

export const resolveAlgebraicBuilderUxAssignment = (model: AlgebraicViewModel): UxRoleAssignment => ({
  uxRole: model.builderUxRole,
  uxState: model.builderUxState,
});

export const resolveAlgebraicEquationUxAssignment = (model: AlgebraicViewModel): UxRoleAssignment => ({
  uxRole: model.equationUxRole,
  uxState: model.equationUxState,
});

export const resolveAlgebraicTruncationUxAssignment = (model: AlgebraicViewModel): UxRoleAssignment => ({
  uxRole: model.truncationUxRole,
  uxState: model.truncationUxState,
});

export const buildOperationSlotDisplay = (state: GameState): string => {
  const visibleSlots = state.unlocks.maxSlots;
  if (visibleSlots <= 0) {
    return "(no operation slots)";
  }

  const noSeedEnteredYet =
    algebraicHelpers.isZeroRational(state.calculator.total)
    && !state.calculator.pendingNegativeTotal
    && state.calculator.rollEntries.length === 0
    && (state.calculator.singleDigitInitialTotalEntry || !algebraicHelpers.hasAnyKeyPress(state));
  const seedToken = state.calculator.rollEntries.length > 0
    ? calculatorValueToDisplayString(getSeedRow(state.calculator.rollEntries)?.y ?? state.calculator.total)
    : noSeedEnteredYet
      ? "_"
      : calculatorValueToDisplayString(state.calculator.total);

  const stepThroughOnKeypad = state.ui.keyLayout.some(
    (cell) => cell.kind === "key" && cell.key === KEY_ID.exec_step_through,
  );
  const expansionEnabled = state.settings.stepExpansion === "on" && state.settings.forecast === "on";
  const stepProgress = state.calculator.stepProgress;
  const stepTargetIndex =
    (stepThroughOnKeypad || expansionEnabled) && state.calculator.operationSlots.length > 0
      ? stepProgress.active
        ? stepProgress.nextSlotIndex
        : 0
      : null;

  const filledTokens = state.calculator.operationSlots.map((slot, index) => {
    if (stepProgress.active && index < stepProgress.executedSlotResults.length) {
      return `[ -> ${calculatorValueToDisplayString(stepProgress.executedSlotResults[index])} ]`;
    }

    let token = slot.kind === "unary"
      ? `[ ${keyLabelInternals.formatUnarySlotToken(slot.operator)} ]`
      : `[ ${formatOperatorForOperationSlotDisplay(slot.operator)} ${typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand))} ]`;

    if (expansionEnabled && stepTargetIndex === index) {
      const expansion = resolveStepExpansionText(slot, {
        seedTotal: stepProgress.seedTotal ?? state.calculator.total,
        currentTotal: stepProgress.currentTotal ?? state.calculator.total,
        nextSlotIndex: stepProgress.active ? stepProgress.nextSlotIndex : 0,
      });
      if (expansion) {
        token = `[ ${expansion} ]`;
      }
    }
    return token;
  });
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput
      ? `${state.calculator.draftingSlot.isNegative ? "-" : ""}${state.calculator.draftingSlot.operandInput}`
      : state.calculator.draftingSlot.isNegative
        ? "-_"
        : "_";
    filledTokens.push(`[ ${formatOperatorForOperationSlotDisplay(state.calculator.draftingSlot.operator)} ${operand} ]`);
  }

  const tokens = filledTokens.slice(0, visibleSlots);
  while (tokens.length < visibleSlots) {
    tokens.push("[ _ _ ]");
  }

  return `${seedToken} ${tokens.join(" ")}`;
};

const resolveSeedValueForAlgebra = (state: GameState): CalculatorValue | null => {
  if (state.calculator.rollEntries.length > 0) {
    return getSeedRow(state.calculator.rollEntries)?.y ?? null;
  }

  const noSeedEnteredYet =
    algebraicHelpers.isZeroRational(state.calculator.total)
    && !state.calculator.pendingNegativeTotal
    && state.calculator.rollEntries.length === 0
    && state.calculator.operationSlots.length === 0
    && state.calculator.draftingSlot === null
    && (state.calculator.singleDigitInitialTotalEntry || !algebraicHelpers.hasAnyKeyPress(state));
  if (noSeedEnteredYet) {
    return null;
  }

  return state.calculator.total;
};

const normalizeDraftOperandText = (drafting: NonNullable<GameState["calculator"]["draftingSlot"]>): { value: string; incomplete: boolean } => {
  if (drafting.operandInput === "") {
    return { value: "_", incomplete: true };
  }
  const signedValue = `${drafting.isNegative ? "-" : ""}${drafting.operandInput}`;
  return { value: signedValue, incomplete: false };
};

const toExpressionOperandText = (operand: BinarySlot["operand"]): string =>
  typeof operand === "bigint" ? operand.toString() : expressionToDisplayString(slotOperandToExpression(operand));

export const buildFunctionRecurrenceDisplay = (
  state: GameState,
): { line: string; hasIncompleteDraft: boolean; containsEuclidLiteral: boolean; expressionText: string } => {
  const symbol = resolveFormulaSymbol(state);
  const currentToken = `${symbol}_{x-1}`;
  const nextToken = `${symbol}_{x}`;
  let displayAccumulator = currentToken;
  let expressionAccumulator = currentToken;
  let hasIncompleteDraft = false;
  let containsEuclidLiteral = false;

  for (const slot of state.calculator.operationSlots) {
    if (!("operand" in slot)) {
      const unaryDisplay = keyLabelInternals.formatUnarySlotOperator(slot.operator);
      displayAccumulator = `(${displayAccumulator} ${unaryDisplay})`;
      expressionAccumulator = `(${expressionAccumulator}${slot.operator})`;
      continue;
    }
    const operandText = toExpressionOperandText(slot.operand);
    const displayOperator = keyLabelInternals.formatAlgebraicOperator(slot.operator);
    displayAccumulator = `(${displayAccumulator} ${displayOperator} ${operandText})`;
    expressionAccumulator = `(${expressionAccumulator}${slot.operator}${operandText})`;
    containsEuclidLiteral = containsEuclidLiteral || keyLabelInternals.isEuclidLiteralOperator(slot.operator);
  }

  if (state.calculator.draftingSlot) {
    const draftOperand = normalizeDraftOperandText(state.calculator.draftingSlot);
    const displayOperator = keyLabelInternals.formatAlgebraicOperator(state.calculator.draftingSlot.operator);
    displayAccumulator = `(${displayAccumulator} ${displayOperator} ${draftOperand.value})`;
    expressionAccumulator = `(${expressionAccumulator}${state.calculator.draftingSlot.operator}${draftOperand.value})`;
    hasIncompleteDraft = draftOperand.incomplete;
    containsEuclidLiteral = containsEuclidLiteral || keyLabelInternals.isEuclidLiteralOperator(state.calculator.draftingSlot.operator);
  }

  return {
    line: `${nextToken} = ${displayAccumulator}`,
    hasIncompleteDraft,
    containsEuclidLiteral,
    expressionText: expressionAccumulator,
  };
};

export const buildAlgebraicViewModel = (state: GameState): AlgebraicViewModel => {
  const symbol = resolveFormulaSymbol(state);
  const seedValue = resolveSeedValueForAlgebra(state);
  const seedLine = seedValue ? `${symbol}_0 = ${calculatorValueToDisplayString(seedValue)}` : `${symbol}_0 = _`;
  const recurrence = buildFunctionRecurrenceDisplay(state);
  const preRollMain = recurrence.line;

  if (state.calculator.rollEntries.length === 0) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "builder_unsimplified",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
      builderUxRole: "analysis",
      builderUxState: "normal",
      equationUxRole: "default",
      equationUxState: "normal",
      truncationUxRole: "analysis",
      truncationUxState: "active",
    };
  }

  if (recurrence.containsEuclidLiteral) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "roll_literal",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
      builderUxRole: "analysis",
      builderUxState: "normal",
      equationUxRole: "analysis",
      equationUxState: "active",
      truncationUxRole: "analysis",
      truncationUxState: "active",
    };
  }

  const latestRelevantSymbolic = [...state.calculator.rollEntries]
    .reverse()
    .find((entry) => entry.symbolic?.exprText === recurrence.expressionText);

  if (!latestRelevantSymbolic?.symbolic) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "builder_unsimplified",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
      builderUxRole: "analysis",
      builderUxState: "normal",
      equationUxRole: "default",
      equationUxState: "normal",
      truncationUxRole: "analysis",
      truncationUxState: "active",
    };
  }

  return {
    seedLine,
    recurrenceLine: recurrence.line,
    mainLine: latestRelevantSymbolic.symbolic.renderText,
    mainLineSource: "roll_simplified",
    hasIncompleteDraft: recurrence.hasIncompleteDraft,
    containsEuclidLiteral: recurrence.containsEuclidLiteral,
    recurrenceExpressionText: recurrence.expressionText,
    builderUxRole: "analysis",
    builderUxState: "normal",
    equationUxRole: "default",
    equationUxState: "normal",
    truncationUxRole: "analysis",
    truncationUxState: "active",
  };
};
