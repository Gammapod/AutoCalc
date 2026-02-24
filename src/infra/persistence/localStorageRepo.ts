import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout } from "../../domain/state.js";
import type { GameState, LayoutCell, Slot } from "../../domain/types.js";

type SerializableSlot = {
  operator: Slot["operator"];
  operand: string;
};

type SerializableState = {
  calculator: {
    total: string;
    roll: string[];
    operationSlots: SerializableSlot[];
    draftingSlot: GameState["calculator"]["draftingSlot"];
  };
  ui?: {
    keyLayout?: LayoutCell[];
  };
  unlocks: GameState["unlocks"];
  completedUnlockIds: string[];
};

type SavePayload = {
  schemaVersion: number;
  savedAt: number;
  state: SerializableState;
};

type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const toSerializableState = (state: GameState): SerializableState => ({
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

const fromSerializableState = (payloadState: SerializableState): GameState => ({
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
  ui: {
    keyLayout: payloadState.ui?.keyLayout ?? defaultKeyLayout(),
  },
});

export const createLocalStorageRepo = (storage: KeyValueStorage) => ({
  load: (): GameState | null => {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as SavePayload;
      if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION || !parsed.state) {
        return null;
      }
      return fromSerializableState(parsed.state);
    } catch {
      return null;
    }
  },

  save: (state: GameState): void => {
    const payload: SavePayload = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: toSerializableState(state),
    };
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
  },

  clear: (): void => {
    storage.removeItem(SAVE_KEY);
  },
});
