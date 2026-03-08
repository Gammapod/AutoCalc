import { toCommittedDraftingSlot } from "./slotDrafting.js";
import { slotOperandToExpression } from "./expression.js";
import type { CalculatorState, Digit, DraftingSlot, Slot, SlotOperator } from "./types.js";

export type FunctionBuilderState = {
  operationSlots: Slot[];
  draftingSlot: DraftingSlot | null;
};

export type FunctionBuilderLimits = {
  maxSlots: number;
  maxOperandDigits: number;
};

const isNaturalDivisorOperator = (operator: SlotOperator): boolean => operator === "#" || operator === "\u27E1";

const withDigit = (source: string, digit: Digit): string => {
  if (source === "0") {
    return digit;
  }
  return `${source}${digit}`;
};
const DIGITS_ONLY_RE = /^\d+$/;

export const fromCalculator = (
  calculator: Pick<CalculatorState, "operationSlots" | "draftingSlot">,
): FunctionBuilderState => ({
  operationSlots: calculator.operationSlots,
  draftingSlot: calculator.draftingSlot,
});

export const toCalculatorPatch = (
  state: FunctionBuilderState,
): Pick<CalculatorState, "operationSlots" | "draftingSlot"> => ({
  operationSlots: state.operationSlots,
  draftingSlot: state.draftingSlot,
});

export const applyOperatorInput = (
  builder: FunctionBuilderState,
  operator: SlotOperator,
  limits: FunctionBuilderLimits,
): FunctionBuilderState => {
  const draftingSlot = builder.draftingSlot;
  if (draftingSlot) {
    if (draftingSlot.operandInput === "") {
      if (draftingSlot.operator === operator) {
        return builder;
      }
      return {
        operationSlots: builder.operationSlots,
        draftingSlot: {
          ...draftingSlot,
          operator,
        },
      };
    }

    const committedDraftingSlot = toCommittedDraftingSlot(draftingSlot);
    if (!committedDraftingSlot) {
      return builder;
    }
    const committedSlots = [...builder.operationSlots, committedDraftingSlot];
    if (committedSlots.length >= limits.maxSlots) {
      return {
        operationSlots: committedSlots,
        draftingSlot: null,
      };
    }
    return {
      operationSlots: committedSlots,
      draftingSlot: {
        operator,
        operandInput: "",
        isNegative: false,
      },
    };
  }

  if (builder.operationSlots.length >= limits.maxSlots) {
    return builder;
  }
  return {
    operationSlots: builder.operationSlots,
    draftingSlot: {
      operator,
      operandInput: "",
      isNegative: false,
    },
  };
};

export const applyDigitInput = (
  builder: FunctionBuilderState,
  digit: Digit,
  limits: FunctionBuilderLimits,
): FunctionBuilderState => {
  const draftingSlot = builder.draftingSlot;
  if (draftingSlot) {
    if (draftingSlot.operandInput.length > 0 && !DIGITS_ONLY_RE.test(draftingSlot.operandInput)) {
      return {
        operationSlots: builder.operationSlots,
        draftingSlot: {
          ...draftingSlot,
          operandInput: digit,
        },
      };
    }
    if (draftingSlot.operandInput.length >= limits.maxOperandDigits) {
      return {
        operationSlots: builder.operationSlots,
        draftingSlot: {
          ...draftingSlot,
          operandInput: digit,
        },
      };
    }
    return {
      operationSlots: builder.operationSlots,
      draftingSlot: {
        ...draftingSlot,
        operandInput: withDigit(draftingSlot.operandInput, digit),
      },
    };
  }

  if (builder.operationSlots.length === 0) {
    return builder;
  }

  const nextMagnitude = BigInt(digit);
  const slotIndex = builder.operationSlots.length - 1;
  const currentSlot = builder.operationSlots[slotIndex];
  const nextOperand =
    isNaturalDivisorOperator(currentSlot.operator)
      ? nextMagnitude
      : typeof currentSlot.operand === "bigint"
        ? (nextMagnitude === 0n ? 0n : currentSlot.operand < 0n ? -nextMagnitude : nextMagnitude)
        : nextMagnitude;
  if (nextOperand === currentSlot.operand) {
    return builder;
  }
  const operationSlots = [...builder.operationSlots];
  operationSlots[slotIndex] = {
    ...currentSlot,
    operand: nextOperand,
  };
  return {
    operationSlots,
    draftingSlot: null,
  };
};

export const applyNegateInput = (builder: FunctionBuilderState): FunctionBuilderState => {
  const draftingSlot = builder.draftingSlot;
  if (draftingSlot) {
    if (isNaturalDivisorOperator(draftingSlot.operator)) {
      return builder;
    }
    return {
      operationSlots: builder.operationSlots,
      draftingSlot: {
        ...draftingSlot,
        isNegative: !draftingSlot.isNegative,
      },
    };
  }

  if (builder.operationSlots.length === 0) {
    return builder;
  }

  const slotIndex = builder.operationSlots.length - 1;
  const currentSlot = builder.operationSlots[slotIndex];
  if (isNaturalDivisorOperator(currentSlot.operator)) {
    return builder;
  }
  if (typeof currentSlot.operand === "bigint" && currentSlot.operand === 0n) {
    return builder;
  }
  const operationSlots = [...builder.operationSlots];
  const nextOperand: Slot["operand"] =
    typeof currentSlot.operand === "bigint"
      ? -currentSlot.operand
      : (currentSlot.operand.type === "unary" && currentSlot.operand.op === "neg")
        ? currentSlot.operand.arg
        : { type: "unary", op: "neg", arg: slotOperandToExpression(currentSlot.operand) };
  operationSlots[slotIndex] = {
    ...currentSlot,
    operand: nextOperand,
  };
  return {
    operationSlots,
    draftingSlot: null,
  };
};

export const finalizeDrafting = (builder: FunctionBuilderState): FunctionBuilderState => {
  const draftingSlot = builder.draftingSlot;
  if (!draftingSlot) {
    return builder;
  }
  if (draftingSlot.operandInput === "") {
    return {
      operationSlots: builder.operationSlots,
      draftingSlot: null,
    };
  }
  const committedDraftingSlot = toCommittedDraftingSlot(draftingSlot);
  if (!committedDraftingSlot) {
    return builder;
  }
  return {
    operationSlots: [...builder.operationSlots, committedDraftingSlot],
    draftingSlot: null,
  };
};
