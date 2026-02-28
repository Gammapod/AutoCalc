import {
  createLocalStorageRepo,
  loadFromRawSave,
  type LoadResult,
} from "../../src/infra/persistence/localStorageRepo.js";
import type { GameState } from "../../src/domain/types.js";

type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type V2Repository = {
  load: () => GameState | null;
  save: (state: GameState) => void;
  clear: () => void;
};

export const createRepository = (storage: KeyValueStorage): V2Repository =>
  createLocalStorageRepo(storage);

export const loadFromRawSaveV2 = (raw: string | null): LoadResult => loadFromRawSave(raw);
