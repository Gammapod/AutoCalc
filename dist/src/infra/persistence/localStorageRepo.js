import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../../domain/state.js";
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