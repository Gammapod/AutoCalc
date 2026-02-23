export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 1;
export const initialState = () => ({
    calculator: {
        total: 0n,
        roll: [],
        operationSlots: [],
        draftingSlot: null,
    },
    unlocks: {
        digits: {
            "0": true,
            "1": true,
            "2": true,
            "3": true,
            "4": true,
            "5": true,
            "6": true,
            "7": true,
            "8": true,
            "9": true,
        },
        slotOperators: {
            "+": true,
        },
        utilities: {
            C: true,
            CE: false,
        },
        maxSlots: 1,
    },
    completedUnlockIds: [],
});
//# sourceMappingURL=state.js.map