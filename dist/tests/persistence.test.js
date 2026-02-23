import assert from "node:assert/strict";
import { createLocalStorageRepo } from "../src/infra/persistence/localStorageRepo.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, initialState } from "../src/domain/state.js";
const createMemoryStorage = () => {
    const map = new Map();
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
};
export const runPersistenceTests = () => {
    const storage = createMemoryStorage();
    const repo = createLocalStorageRepo(storage);
    const state = initialState();
    const nextState = {
        ...state,
        calculator: {
            ...state.calculator,
            total: 15n,
            roll: [3n, 9n, 15n],
            operationSlots: [{ operator: "+", operand: 6n }],
        },
    };
    repo.save(nextState);
    const loaded = repo.load();
    if (!loaded) {
        throw new Error("Expected hydrated state, received null.");
    }
    assert.equal(loaded.calculator.total, 15n, "hydrate bigint total");
    assert.deepEqual(loaded.calculator.roll, [3n, 9n, 15n], "hydrate bigint roll");
    assert.deepEqual(loaded.calculator.operationSlots, [{ operator: "+", operand: 6n }], "hydrate slot bigint operand");
    const badSchemaStorage = createMemoryStorage();
    badSchemaStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1, state: { calculator: {} } }));
    const badSchemaRepo = createLocalStorageRepo(badSchemaStorage);
    assert.equal(badSchemaRepo.load(), null, "reject wrong schema");
};
//# sourceMappingURL=persistence.test.js.map