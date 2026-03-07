import assert from "node:assert/strict";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, initialState } from "../src/domain/state.js";
import { createLocalStorageRepo } from "../src/infra/persistence/localStorageRepo.js";
import { createRepository, loadFromRawSaveV2 } from "../src/persistence/repository.js";

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
  const legacyRepo = createLocalStorageRepo(storage);
  const v2Repo = createRepository(storage);

  const state = initialState();
  legacyRepo.save(state);

  const raw = storage.getItem(SAVE_KEY);
  assert.ok(raw, "legacy save writes payload");

  const legacyLoaded = legacyRepo.load();
  const v2Loaded = v2Repo.load();
  assert.deepEqual(v2Loaded, legacyLoaded, "v2 repository hydrates identical state to legacy repository");

  const parsed = JSON.parse(raw ?? "{}");
  assert.equal(parsed.schemaVersion, SAVE_SCHEMA_VERSION, "save schema version remains current");

  const malformed = loadFromRawSaveV2("{");
  assert.equal(malformed.state, null, "v2 raw loader rejects malformed JSON");
};
