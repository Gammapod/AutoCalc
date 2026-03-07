import assert from "node:assert/strict";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, initialState } from "../src/domain/state.js";
import { createLocalStorageRepo, loadFromRawSave } from "../src/infra/persistence/localStorageRepo.js";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const createMemoryStorage = (): MemoryStorage => {
  const map = new Map<string, string>();
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

export const runV2PersistenceParityTests = (): void => {
  const storage = createMemoryStorage();
  const repo = createLocalStorageRepo(storage);

  const state = initialState();
  repo.save(state);

  const raw = storage.getItem(SAVE_KEY);
  assert.ok(raw, "save writes payload");

  const loaded = repo.load();
  assert.deepEqual(loaded, state, "repository hydrates saved state");

  const parsed = JSON.parse(raw ?? "{}");
  assert.equal(parsed.schemaVersion, SAVE_SCHEMA_VERSION, "save schema version remains current");

  const malformed = loadFromRawSave("{");
  assert.equal(malformed.state, null, "raw loader rejects malformed JSON");
};
