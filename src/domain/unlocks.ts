import { fromKeyLayoutArray, toIndexFromCoord } from "./keypadLayoutModel.js";
import { applyUpgradeKeypadColumn, applyUpgradeKeypadRow } from "./reducer.layout.js";
import { clearOperationEntry } from "./reducer.stateBuilders.js";
import { STORAGE_COLUMNS } from "./state.js";
import { setButtonUnlocked } from "./buttonStateAccess.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import type { GameState, Key, UnlockDefinition, UnlockEffect, UnlockPredicate } from "./types.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";

export const evaluatePredicate = (predicate: UnlockPredicate, state: GameState): boolean =>
  evaluateUnlockPredicate(predicate, state);

const withKeyLayout = (state: GameState, keyLayout: GameState["ui"]["keyLayout"]): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    keyLayout,
    keypadCells: fromKeyLayoutArray(keyLayout, state.ui.keypadColumns, state.ui.keypadRows),
  },
});

const appendStorageRow = (storage: Array<GameState["ui"]["storageLayout"][number]>): Array<GameState["ui"]["storageLayout"][number]> => ([
  ...storage,
  ...Array.from({ length: STORAGE_COLUMNS }, () => null),
]);

const putInStorage = (
  storage: Array<GameState["ui"]["storageLayout"][number]>,
  cell: NonNullable<GameState["ui"]["storageLayout"][number]>,
): Array<GameState["ui"]["storageLayout"][number]> => {
  const next = [...storage];
  let emptyIndex = next.findIndex((slot) => slot === null);
  if (emptyIndex < 0) {
    const expanded = appendStorageRow(next);
    emptyIndex = expanded.findIndex((slot) => slot === null);
    expanded[emptyIndex] = cell;
    return expanded;
  }
  next[emptyIndex] = cell;
  return next;
};

type KeyLocation = { surface: "keypad"; index: number } | { surface: "storage"; index: number };

const findKey = (state: GameState, key: Key): KeyLocation | null => {
  const keypadIndex = state.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === key);
  if (keypadIndex >= 0) {
    return { surface: "keypad", index: keypadIndex };
  }
  const storageIndex = state.ui.storageLayout.findIndex((cell) => cell?.kind === "key" && cell.key === key);
  if (storageIndex >= 0) {
    return { surface: "storage", index: storageIndex };
  }
  return null;
};

const moveKeyToCoord = (state: GameState, effect: Extract<UnlockEffect, { type: "move_key_to_coord" }>): GameState => {
  const destinationIndex = toIndexFromCoord(
    { row: effect.row, col: effect.col },
    state.ui.keypadColumns,
    state.ui.keypadRows,
  );
  if (destinationIndex < 0 || destinationIndex >= state.ui.keyLayout.length) {
    return state;
  }

  const source = findKey(state, effect.key);
  if (!source) {
    return state;
  }
  if (source.surface === "keypad" && source.index === destinationIndex) {
    return state;
  }

  const destinationCell = state.ui.keyLayout[destinationIndex];
  const sourceCell =
    source.surface === "keypad"
      ? state.ui.keyLayout[source.index]
      : state.ui.storageLayout[source.index];
  if (!sourceCell || sourceCell.kind !== "key") {
    return state;
  }

  let nextKeyLayout = [...state.ui.keyLayout];
  let nextStorage = [...state.ui.storageLayout];
  if (source.surface === "keypad") {
    nextKeyLayout[source.index] = { kind: "placeholder", area: "empty" };
  } else {
    nextStorage[source.index] = null;
  }

  if (destinationCell.kind === "key") {
    nextStorage = putInStorage(nextStorage, destinationCell);
  }
  nextKeyLayout[destinationIndex] = sourceCell;

  let nextState = withKeyLayout(
    {
      ...state,
      ui: {
        ...state.ui,
        storageLayout: nextStorage,
      },
    },
    nextKeyLayout,
  );

  if (source.surface === "storage") {
    nextState = clearOperationEntry(nextState);
  }
  return nextState;
};

const isUnlockKeyEffect = (
  effect: UnlockEffect,
): effect is
  | Extract<UnlockEffect, { type: "unlock_digit" }>
  | Extract<UnlockEffect, { type: "unlock_slot_operator" }>
  | Extract<UnlockEffect, { type: "unlock_execution" }>
  | Extract<UnlockEffect, { type: "unlock_visualizer" }>
  | Extract<UnlockEffect, { type: "unlock_utility" }>
  | Extract<UnlockEffect, { type: "unlock_memory" }> =>
  effect.type === "unlock_digit" ||
  effect.type === "unlock_slot_operator" ||
  effect.type === "unlock_visualizer" ||
  effect.type === "unlock_execution" ||
  effect.type === "unlock_utility" ||
  effect.type === "unlock_memory";

const keyFromUnlockEffect = (
  effect: Extract<
    UnlockEffect,
    { type: "unlock_digit" } | { type: "unlock_slot_operator" } | { type: "unlock_execution" } | { type: "unlock_visualizer" } | { type: "unlock_utility" } | { type: "unlock_memory" }
  >,
): Key => effect.key;

const toStorageWithLeadingUnlockedKey = (
  storage: Array<GameState["ui"]["storageLayout"][number]>,
  keyCell: NonNullable<GameState["ui"]["storageLayout"][number]>,
): Array<GameState["ui"]["storageLayout"][number]> => {
  const packed = [keyCell, ...storage.flatMap((cell) => (cell && cell.key !== keyCell.key ? [cell] : []))];
  const requiredRows = Math.max(1, Math.ceil((packed.length + 1) / STORAGE_COLUMNS));
  const targetLength = requiredRows * STORAGE_COLUMNS;
  const nextStorage: Array<GameState["ui"]["storageLayout"][number]> = [...packed];
  while (nextStorage.length < targetLength) {
    nextStorage.push(null);
  }
  return nextStorage;
};

const moveUnlockedKeyToStorageFront = (state: GameState, key: Key): GameState => {
  const source = findKey(state, key);
  if (!source) {
    return state;
  }

  const sourceCell =
    source.surface === "keypad"
      ? state.ui.keyLayout[source.index]
      : state.ui.storageLayout[source.index];
  if (!sourceCell || sourceCell.kind !== "key") {
    return state;
  }

  let baseState = state;
  if (source.surface === "keypad") {
    const nextKeyLayout = [...state.ui.keyLayout];
    nextKeyLayout[source.index] = { kind: "placeholder", area: "empty" };
    baseState = withKeyLayout(state, nextKeyLayout);
  }

  const nextStorage = toStorageWithLeadingUnlockedKey(baseState.ui.storageLayout, sourceCell);
  let nextState: GameState = {
    ...baseState,
    ui: {
      ...baseState.ui,
      storageLayout: nextStorage,
    },
  };
  if (source.surface === "keypad") {
    nextState = clearOperationEntry(nextState);
  }
  return nextState;
};

export const applyEffect = (effect: UnlockEffect, state: GameState): GameState => {
  if (isUnlockKeyEffect(effect)) {
    return setButtonUnlocked(state, keyFromUnlockEffect(effect), true);
  }
  if (effect.type === "increase_max_total_digits") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        maxTotalDigits: state.unlocks.maxTotalDigits + effect.amount,
      },
    };
  }
  if (effect.type === "increase_allocator_max_points") {
    return applyAllocatorRuntimeProjection(state, {
      ...state.lambdaControl,
      maxPoints: state.lambdaControl.maxPoints + effect.amount,
    });
  }
  if (effect.type === "unlock_second_slot") {
    // Slot capacity is allocator-projected; keep this effect as a backward-compatible no-op.
    return state;
  }
  if (effect.type === "upgrade_keypad_column") {
    return applyUpgradeKeypadColumn(state);
  }
  if (effect.type === "upgrade_keypad_row") {
    return applyUpgradeKeypadRow(state);
  }
  if (effect.type === "move_key_to_coord") {
    return moveKeyToCoord(state, effect);
  }
  return state;
};

export const applyUnlocks = (state: GameState, catalog: UnlockDefinition[]): GameState => {
  let nextState = state;
  const newlyUnlockedKeys = new Set<Key>();

  for (const unlock of catalog) {
    const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);

    if (unlock.once && isAlreadyCompleted) {
      continue;
    }

    if (!evaluateUnlockPredicate(unlock.predicate, nextState)) {
      continue;
    }

    nextState = applyEffect(unlock.effect, nextState);
    if (isUnlockKeyEffect(unlock.effect)) {
      const unlockedKey = keyFromUnlockEffect(unlock.effect);
      if (!isAlreadyCompleted) {
        newlyUnlockedKeys.add(unlockedKey);
      }
    }
    if (!isAlreadyCompleted) {
      nextState = {
        ...nextState,
        completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
      };
    }
  }

  for (const key of newlyUnlockedKeys) {
    nextState = moveUnlockedKeyToStorageFront(nextState, key);
  }

  return nextState;
};
