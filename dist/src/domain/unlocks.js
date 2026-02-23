export const evaluatePredicate = (predicate, state) => {
    if (predicate.type === "roll_length_at_least") {
        return state.calculator.roll.length >= predicate.length;
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
    return state;
};
export const applyUnlocks = (state, catalog) => {
    let nextState = state;
    for (const unlock of catalog) {
        if (unlock.once && nextState.completedUnlockIds.includes(unlock.id)) {
            continue;
        }
        if (!evaluatePredicate(unlock.predicate, nextState)) {
            continue;
        }
        nextState = applyEffect(unlock.effect, nextState);
        nextState = {
            ...nextState,
            completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
        };
    }
    return nextState;
};
//# sourceMappingURL=unlocks.js.map