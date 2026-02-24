import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout, initialState } from "../../domain/state.js";
const toSerializableState = (state) => ({
    ...state,
    calculator: {
        ...state.calculator,
        total: state.calculator.total.toString(),
        roll: state.calculator.roll.map((value) => value.toString()),
        operationSlots: state.calculator.operationSlots.map((slot) => ({
            operator: slot.operator,
            operand: slot.operand.toString(),
        })),
    },
});
const defaultUnlocks = () => initialState().unlocks;
const normalizeUnlocks = (source) => {
    const defaults = defaultUnlocks();
    return {
        digits: {
            ...defaults.digits,
            ...(source?.digits ?? {}),
        },
        slotOperators: {
            ...defaults.slotOperators,
            ...(source?.slotOperators ?? {}),
        },
        utilities: {
            ...defaults.utilities,
            ...(source?.utilities ?? {}),
        },
        execution: {
            ...defaults.execution,
            ...(source?.execution ?? {}),
        },
        maxSlots: source?.maxSlots ?? defaults.maxSlots,
        maxTotalDigits: source?.maxTotalDigits ?? defaults.maxTotalDigits,
    };
};
const fromSerializableState = (payloadState) => ({
    ...payloadState,
    calculator: {
        ...payloadState.calculator,
        total: BigInt(payloadState.calculator.total),
        roll: payloadState.calculator.roll.map((value) => BigInt(value)),
        operationSlots: payloadState.calculator.operationSlots.map((slot) => ({
            operator: slot.operator,
            operand: BigInt(slot.operand),
        })),
    },
    ui: {
        keyLayout: payloadState.ui?.keyLayout ?? defaultKeyLayout(),
    },
    unlocks: normalizeUnlocks(payloadState.unlocks),
    completedUnlockIds: payloadState.completedUnlockIds ?? [],
});
export const createLocalStorageRepo = (storage) => ({
    load: () => {
        const raw = storage.getItem(SAVE_KEY);
        if (!raw) {
            return null;
        }
        try {
            const parsed = JSON.parse(raw);
            if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION || !parsed.state) {
                return null;
            }
            return fromSerializableState(parsed.state);
        }
        catch {
            return null;
        }
    },
    save: (state) => {
        const payload = {
            schemaVersion: SAVE_SCHEMA_VERSION,
            savedAt: Date.now(),
            state: toSerializableState(state),
        };
        storage.setItem(SAVE_KEY, JSON.stringify(payload));
    },
    clear: () => {
        storage.removeItem(SAVE_KEY);
    },
});
//# sourceMappingURL=localStorageRepo.js.map