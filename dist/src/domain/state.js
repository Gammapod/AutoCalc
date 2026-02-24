export const SAVE_KEY = "autocalc.v1.save";
export const SAVE_SCHEMA_VERSION = 1;
export const defaultKeyLayout = () => [
    { kind: "key", key: "C" },
    { kind: "key", key: "CE" },
    { kind: "placeholder", area: "mul" },
    { kind: "placeholder", area: "div" },
    { kind: "key", key: "7" },
    { kind: "key", key: "8" },
    { kind: "key", key: "9" },
    { kind: "placeholder", area: "sub" },
    { kind: "key", key: "4" },
    { kind: "key", key: "5" },
    { kind: "key", key: "6" },
    { kind: "key", key: "+" },
    { kind: "key", key: "1" },
    { kind: "key", key: "2" },
    { kind: "key", key: "3" },
    { kind: "key", key: "=", tall: true },
    { kind: "key", key: "0", wide: true },
    { kind: "placeholder", area: "dot" },
];
export const initialState = () => ({
    calculator: {
        total: 0n,
        roll: [],
        operationSlots: [],
        draftingSlot: null,
    },
    ui: {
        keyLayout: defaultKeyLayout(),
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