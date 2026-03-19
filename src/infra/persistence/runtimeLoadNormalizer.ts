import { normalizeLoadedStateForRuntime as normalizeDomainLoadedStateForRuntime } from "../../domain/autoEqualsPolicy.js";
import { defaultStorageLayout, STORAGE_COLUMNS, STORAGE_INITIAL_SLOTS } from "../../domain/state.js";
import type { GameState, Key, KeyCell, LayoutCell } from "../../domain/types.js";

const collectInstalledKeys = (keyLayout: LayoutCell[], storageLayout: Array<KeyCell | null>): Set<Key> => {
  const keys = new Set<Key>();
  for (const cell of keyLayout) {
    if (cell.kind === "key") {
      keys.add(cell.key);
    }
  }
  for (const cell of storageLayout) {
    if (cell?.kind === "key") {
      keys.add(cell.key);
    }
  }
  return keys;
};

const normalizeStorageLength = (storageLayout: Array<KeyCell | null>): Array<KeyCell | null> => {
  const next = [...storageLayout];
  const normalizedLength = Math.max(
    STORAGE_INITIAL_SLOTS,
    Math.ceil(next.length / STORAGE_COLUMNS) * STORAGE_COLUMNS,
  );
  while (next.length < normalizedLength) {
    next.push(null);
  }
  if (!next.some((cell) => cell === null)) {
    for (let index = 0; index < STORAGE_COLUMNS; index += 1) {
      next.push(null);
    }
  }
  return next;
};

const withMissingStorageKeysBackfilled = (state: GameState): GameState => {
  const defaultStorageKeys = defaultStorageLayout()
    .filter((cell): cell is KeyCell => cell?.kind === "key");

  const backfillUi = (ui: GameState["ui"]): GameState["ui"] => {
    const installed = collectInstalledKeys(ui.keyLayout, ui.storageLayout);
    const missing = defaultStorageKeys.filter((cell) => !installed.has(cell.key));
    if (missing.length === 0) {
      return ui;
    }
    const nextStorage = [...ui.storageLayout];
    for (const cell of missing) {
      const emptyIndex = nextStorage.findIndex((entry) => entry === null);
      if (emptyIndex >= 0) {
        nextStorage[emptyIndex] = { ...cell };
      } else {
        nextStorage.push({ ...cell });
      }
    }
    return {
      ...ui,
      storageLayout: normalizeStorageLength(nextStorage),
    };
  };

  const nextRootUi = backfillUi(state.ui);
  let calculatorsChanged = false;
  const nextCalculators = state.calculators
    ? Object.fromEntries(
      Object.entries(state.calculators).map(([id, calculator]) => {
        if (!calculator) {
          return [id, calculator];
        }
        const nextUi = backfillUi(calculator.ui);
        if (nextUi !== calculator.ui) {
          calculatorsChanged = true;
          return [id, { ...calculator, ui: nextUi }];
        }
        return [id, calculator];
      }),
    ) as GameState["calculators"]
    : state.calculators;

  if (nextRootUi === state.ui && !calculatorsChanged) {
    return state;
  }
  return {
    ...state,
    ui: nextRootUi,
    ...(nextCalculators ? { calculators: nextCalculators } : {}),
  };
};

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  loaded
    ? (() => {
      const normalized = normalizeDomainLoadedStateForRuntime(loaded);
      return normalized ? withMissingStorageKeysBackfilled(normalized) : null;
    })()
    : loaded;
