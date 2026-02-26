import { executeSlots } from "./engine.js";
import { initialState } from "./state.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
import { applyUnlocks } from "./unlocks.js";
import type { Action, Digit, GameState, Key, SlotOperator } from "./types.js";

const DIGITS: Digit[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const withDigit = (source: string, digit: Digit): string => {
  if (source === "0") {
    return digit;
  }
  return `${source}${digit}`;
};

const applyDigit = (state: GameState, digit: Digit): GameState => {
  if (!state.unlocks.digits[digit]) {
    return state;
  }

  if (state.calculator.draftingSlot) {
    const draftingSlot = {
      ...state.calculator.draftingSlot,
      operandInput: withDigit(state.calculator.draftingSlot.operandInput, digit),
    };

    const withDraftingSlot: GameState = {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot,
      },
    };

    return applyUnlocks(withDraftingSlot, unlockCatalog);
  }

  const nextTotalInput = withDigit(state.calculator.total.toString(), digit);
  if (nextTotalInput.length > state.unlocks.maxTotalDigits) {
    return state;
  }

  const nextTotal = BigInt(nextTotalInput);

  const withNextTotal: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      total: nextTotal,
    },
  };

  return applyUnlocks(withNextTotal, unlockCatalog);
};

const applyPlus = (state: GameState): GameState => {
  if (!state.unlocks.slotOperators["+"]) {
    return state;
  }

  if (state.calculator.draftingSlot || state.calculator.operationSlots.length >= state.unlocks.maxSlots) {
    return state;
  }

  return {
    ...state,
    calculator: {
      ...state.calculator,
      draftingSlot: {
        operator: "+",
        operandInput: "",
      },
    },
  };
};

const finalizeDraftingSlot = (state: GameState): GameState => {
  const { draftingSlot } = state.calculator;
  if (!draftingSlot) {
    return state;
  }

  if (draftingSlot.operandInput === "") {
    return {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot: null,
      },
    };
  }

  return {
    ...state,
    calculator: {
      ...state.calculator,
      operationSlots: [
        ...state.calculator.operationSlots,
        {
          operator: draftingSlot.operator,
          operand: BigInt(draftingSlot.operandInput),
        },
      ],
      draftingSlot: null,
    },
  };
};

const applyEquals = (state: GameState): GameState => {
  if (!state.unlocks.execution["="]) {
    return state;
  }

  const finalized = finalizeDraftingSlot(state);
  const startingTotal = finalized.calculator.total;
  const { operationSlots, roll } = finalized.calculator;
  const rollWasEmpty = roll.length === 0;
  const hasOperations = operationSlots.length > 0;
  const nextTotal = executeSlots(startingTotal, operationSlots);
  const appendedRoll = rollWasEmpty && hasOperations ? [startingTotal, nextTotal] : [nextTotal];
  const withRoll: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: nextTotal,
      roll: [...roll, ...appendedRoll],
    },
  };

  return applyUnlocks(withRoll, unlockCatalog);
};

const applyC = (state: GameState): GameState => {
  if (!state.unlocks.utilities.C) {
    return state;
  }

  return {
    ...state,
    calculator: {
      total: 0n,
      roll: [],
      operationSlots: [],
      draftingSlot: null,
    },
  };
};

const clearOperationEntry = (state: GameState): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    roll: [],
    operationSlots: [],
    draftingSlot: null,
  },
});

const applyCE = (state: GameState): GameState => {
  if (!state.unlocks.utilities.CE) {
    return state;
  }

  return clearOperationEntry(state);
};

const isDigit = (key: Key): key is Digit => DIGITS.includes(key as Digit);
const isOperator = (key: Key): key is SlotOperator => key === "+";

const resetRunState = (state: GameState): GameState => ({
  ...state,
  calculator: {
    total: 0n,
    roll: [],
    operationSlots: [],
    draftingSlot: null,
  },
});

const preprocessForActiveRoll = (state: GameState, key: Key): GameState => {
  if (state.calculator.roll.length === 0) {
    return state;
  }

  if (isDigit(key)) {
    if (state.calculator.draftingSlot) {
      return state;
    }
    return resetRunState(state);
  }

  if (isOperator(key)) {
    if (!state.unlocks.slotOperators[key]) {
      return state;
    }
    return clearOperationEntry(state);
  }

  return state;
};

const applyKey = (state: GameState, key: Key): GameState => {
  const preprocessed = preprocessForActiveRoll(state, key);

  if (isDigit(key)) {
    return applyDigit(preprocessed, key);
  }
  if (key === "+") {
    return applyPlus(preprocessed);
  }
  if (key === "=") {
    return applyEquals(preprocessed);
  }
  if (key === "C") {
    return applyC(preprocessed);
  }
  if (key === "CE") {
    return applyCE(preprocessed);
  }
  return preprocessed;
};

const isValidLayoutIndex = (layoutLength: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < layoutLength;

const applyMoveKeySlot = (state: GameState, fromIndex: number, toIndex: number): GameState => {
  const layout = state.ui.keyLayout;
  if (
    !isValidLayoutIndex(layout.length, fromIndex) ||
    !isValidLayoutIndex(layout.length, toIndex) ||
    fromIndex === toIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  const [movedCell] = nextLayout.splice(fromIndex, 1);
  nextLayout.splice(toIndex, 0, movedCell);
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
};

const applySwapKeySlots = (state: GameState, firstIndex: number, secondIndex: number): GameState => {
  const layout = state.ui.keyLayout;
  if (
    !isValidLayoutIndex(layout.length, firstIndex) ||
    !isValidLayoutIndex(layout.length, secondIndex) ||
    firstIndex === secondIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  [nextLayout[firstIndex], nextLayout[secondIndex]] = [nextLayout[secondIndex], nextLayout[firstIndex]];
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
};

export const reducer = (state: GameState = initialState(), action: Action): GameState => {
  if (action.type === "PRESS_KEY") {
    return applyKey(state, action.key);
  }
  if (action.type === "RESET_RUN") {
    return initialState();
  }
  if (action.type === "HYDRATE_SAVE") {
    return action.state;
  }
  if (action.type === "MOVE_KEY_SLOT") {
    return applyMoveKeySlot(state, action.fromIndex, action.toIndex);
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    return applySwapKeySlots(state, action.firstIndex, action.secondIndex);
  }
  return state;
};
