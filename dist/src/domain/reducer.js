import { executeSlots } from "./engine.js";
import { initialState } from "./state.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
import { applyUnlocks } from "./unlocks.js";
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const withDigit = (source, digit) => {
    if (source === "0") {
        return digit;
    }
    return `${source}${digit}`;
};
const applyDigit = (state, digit) => {
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
const applyPlus = (state) => {
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
const finalizeDraftingSlot = (state) => {
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
const applyEquals = (state) => {
    const finalized = finalizeDraftingSlot(state);
    const nextTotal = executeSlots(finalized.calculator.total, finalized.calculator.operationSlots);
    const withRoll = {
        ...finalized,
        calculator: {
            ...finalized.calculator,
            total: nextTotal,
            roll: [...finalized.calculator.roll, nextTotal],
        },
    };
    return applyUnlocks(withRoll, unlockCatalog);
};
const applyC = (state) => ({
    ...state,
    calculator: {
        total: 0n,
        roll: [],
        operationSlots: [],
        draftingSlot: null,
    },
});
const applyCE = (state) => {
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
const isDigit = (key) => DIGITS.includes(key);
const applyKey = (state, key) => {
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
export const reducer = (state = initialState(), action) => {
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
//# sourceMappingURL=reducer.js.map