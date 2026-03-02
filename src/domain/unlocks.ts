import { fromKeyLayoutArray, toIndexFromCoord } from "./keypadLayoutModel.js";
import { applyUpgradeKeypadColumn, applyUpgradeKeypadRow } from "./reducer.layout.js";
import { clearOperationEntry } from "./reducer.stateBuilders.js";
import { STORAGE_COLUMNS } from "./state.js";
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

export const applyEffect = (effect: UnlockEffect, state: GameState): GameState => {
  if (effect.type === "unlock_utility") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [effect.key]: true,
        },
      },
    };
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
  if (effect.type === "unlock_slot_operator") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_execution") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        execution: {
          ...state.unlocks.execution,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_digit") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        valueExpression: {
          ...state.unlocks.valueExpression,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_second_slot") {
    // Slot capacity is allocator-projected; keep this effect as a backward-compatible no-op.
    return state;
  }
  if (effect.type === "unlock_storage_drawer") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        uiUnlocks: {
          ...state.unlocks.uiUnlocks,
          storageVisible: true,
        },
      },
    };
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

  for (const unlock of catalog) {
    const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);

    if (unlock.once && isAlreadyCompleted) {
      continue;
    }

    if (!evaluateUnlockPredicate(unlock.predicate, nextState)) {
      continue;
    }

    nextState = applyEffect(unlock.effect, nextState);
    if (!isAlreadyCompleted) {
      nextState = {
        ...nextState,
        completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
      };
    }
  }

  return nextState;
};
