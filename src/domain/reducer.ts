import { executeSlots } from "./engine.js";
import { initialState } from "./state.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
import { applyUnlocks } from "./unlocks.js";
import type { Action, Digit, GameState, Key } from "./types.js";

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

    return {
      ...state,
      calculator: {
        ...state.calculator,
        draftingSlot,
      },
    };
  }

  const nextTotal = BigInt(withDigit(state.calculator.total.toString(), digit));

  return {
    ...state,
    calculator: {
      ...state.calculator,
      total: nextTotal,
    },
  };
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
  const finalized = finalizeDraftingSlot(state);
  const nextTotal = executeSlots(finalized.calculator.total, finalized.calculator.operationSlots);
  const withRoll: GameState = {
    ...finalized,
    calculator: {
      ...finalized.calculator,
      total: nextTotal,
      roll: [...finalized.calculator.roll, nextTotal],
    },
  };

  return applyUnlocks(withRoll, unlockCatalog);
};

const applyC = (state: GameState): GameState => ({
  ...state,
  calculator: {
    total: 0n,
    roll: [],
    operationSlots: [],
    draftingSlot: null,
  },
});

const applyCE = (state: GameState): GameState => {
  if (!state.unlocks.utilities.CE) {
    return state;
  }

  return {
    ...state,
    calculator: {
      ...state.calculator,
      operationSlots: [],
      draftingSlot: null,
    },
  };
};

const isDigit = (key: Key): key is Digit => DIGITS.includes(key as Digit);

const applyKey = (state: GameState, key: Key): GameState => {
  if (isDigit(key)) {
    return applyDigit(state, key);
  }
  if (key === "+") {
    return applyPlus(state);
  }
  if (key === "=") {
    return applyEquals(state);
  }
  if (key === "C") {
    return applyC(state);
  }
  if (key === "CE") {
    return applyCE(state);
  }
  return state;
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
  return state;
};
