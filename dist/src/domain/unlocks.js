export const evaluatePredicate = (predicate, state) => {
    if (predicate.type === "roll_length_at_least") {
        return state.calculator.roll.length >= predicate.length;
    }
    if (predicate.type === "total_equals") {
        return state.calculator.total === predicate.value;
    }
    if (predicate.type === "operation_equals") {
        const slots = [...state.calculator.operationSlots];
        if (predicate.includeDrafting ?? true) {
            const { draftingSlot } = state.calculator;
            if (draftingSlot && draftingSlot.operandInput !== "") {
                slots.push({
                    operator: draftingSlot.operator,
                    operand: BigInt(draftingSlot.operandInput),
                });
            }
        }
        return (slots.length === predicate.slots.length &&
            slots.every((slot, index) => slot.operator === predicate.slots[index].operator && slot.operand === predicate.slots[index].operand));
    }
    return false;
};
export const applyEffect = (effect, state) => {
    if (effect.type === "unlock_utility") {
        return {
            ...state,
            unlocks: {
                ...state.unlocks,
                utilities: {
                    ...state.unlocks.utilities,
                    [effect.key]: true,
                },
            },
        };
    }
    if (effect.type === "increase_max_total_digits") {
        return {
            ...state,
            unlocks: {
                ...state.unlocks,
                maxTotalDigits: state.unlocks.maxTotalDigits + effect.amount,
            },
        };
    }
    if (effect.type === "unlock_slot_operator") {
        return {
            ...state,
            unlocks: {
                ...state.unlocks,
                slotOperators: {
                    ...state.unlocks.slotOperators,
                    [effect.key]: true,
                },
            },
        };
    }
    if (effect.type === "unlock_execution") {
        return {
            ...state,
            unlocks: {
                ...state.unlocks,
                execution: {
                    ...state.unlocks.execution,
                    [effect.key]: true,
                },
            },
        };
    }
    return state;
};
export const applyUnlocks = (state, catalog) => {
    let nextState = state;
    for (const unlock of catalog) {
        const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);
        if (unlock.once && isAlreadyCompleted) {
            continue;
        }
        if (!evaluatePredicate(unlock.predicate, nextState)) {
            continue;
        }
        nextState = applyEffect(unlock.effect, nextState);
        if (!isAlreadyCompleted) {
            nextState = {
                ...nextState,
                completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
            };
        }
    }
    return nextState;
};
//# sourceMappingURL=unlocks.js.map