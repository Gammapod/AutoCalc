import { parseRational, toDisplayString } from "../math/rationalEngine.js";
import { SAVE_KEY, SAVE_SCHEMA_VERSION, defaultKeyLayout, initialState } from "../../domain/state.js";
import type { GameState, LayoutCell, Slot, UnlockState } from "../../domain/types.js";

type SerializableSlot = {
  operator: Slot["operator"];
  operand: string;
};

type SerializableState = {
  calculator: {
    total: string;
    pendingNegativeTotal?: boolean;
    roll: string[];
    euclidRemainders?: Array<{ rollIndex: number; value: string }>;
    operationSlots: SerializableSlot[];
    draftingSlot: GameState["calculator"]["draftingSlot"];
  };
  ui?: {
    keyLayout?: LayoutCell[];
  };
  unlocks?: Partial<UnlockState> & {
    digits?: Partial<UnlockState["digits"]>;
    slotOperators?: Partial<UnlockState["slotOperators"]>;
    utilities?: Partial<UnlockState["utilities"]>;
    execution?: Partial<UnlockState["execution"]>;
  };
  completedUnlockIds?: string[];
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

const normalizeKeyLayout = (layout?: LayoutCell[]): LayoutCell[] => {
  const normalized = [...(layout ?? defaultKeyLayout())];

  const hasNegKey = normalized.some((cell) => cell.kind === "key" && cell.key === "NEG");
  if (!hasNegKey) {
    const negatePlaceholderIndex = normalized.findIndex((cell) => cell.kind === "placeholder" && cell.area === "negate");
    if (negatePlaceholderIndex >= 0) {
      normalized[negatePlaceholderIndex] = { kind: "key", key: "NEG" };
    }
  }

  const hasDivKey = normalized.some((cell) => cell.kind === "key" && cell.key === "/");
  if (!hasDivKey) {
    const divPlaceholderIndex = normalized.findIndex((cell) => cell.kind === "placeholder" && cell.area === "div");
    if (divPlaceholderIndex >= 0) {
      normalized[divPlaceholderIndex] = { kind: "key", key: "/" };
    }
  }

  const hasModKey = normalized.some((cell) => cell.kind === "key" && cell.key === "⟡");
  if (!hasModKey) {
    const modPlaceholderIndex = normalized.findIndex((cell) => cell.kind === "placeholder" && cell.area === "mod");
    if (modPlaceholderIndex >= 0) {
      normalized[modPlaceholderIndex] = { kind: "key", key: "⟡" };
    }
  }

  const hasMulKey = normalized.some((cell) => cell.kind === "key" && cell.key === "*");
  if (!hasMulKey) {
    const mulPlaceholderIndex = normalized.findIndex((cell) => cell.kind === "placeholder" && cell.area === "mul");
    if (mulPlaceholderIndex >= 0) {
      normalized[mulPlaceholderIndex] = { kind: "key", key: "*" };
    }
  }

  const hasEuclidDivKey = normalized.some((cell) => cell.kind === "key" && cell.key === "#");
  if (!hasEuclidDivKey) {
    const euclidPlaceholderIndex = normalized.findIndex(
      (cell) => cell.kind === "placeholder" && cell.area === "euclid_divmod",
    );
    if (euclidPlaceholderIndex >= 0) {
      normalized[euclidPlaceholderIndex] = { kind: "key", key: "#" };
    }
  }

  return normalized;
};

const toSerializableState = (state: GameState): SerializableState => ({
  ...state,
  calculator: {
    ...state.calculator,
    total: toDisplayString(state.calculator.total),
    roll: state.calculator.roll.map((value) => toDisplayString(value)),
    euclidRemainders: state.calculator.euclidRemainders.map((entry) => ({
      rollIndex: entry.rollIndex,
      value: toDisplayString(entry.value),
    })),
    operationSlots: state.calculator.operationSlots.map((slot) => ({
      operator: slot.operator,
      operand: slot.operand.toString(),
    })),
  },
});

const defaultUnlocks = (): UnlockState => initialState().unlocks;

const normalizeUnlocks = (source?: SerializableState["unlocks"]): UnlockState => {
  const defaults = defaultUnlocks();
  return {
    digits: {
      ...defaults.digits,
      ...(source?.digits ?? {}),
    },
    slotOperators: {
      ...defaults.slotOperators,
      ...(source?.slotOperators ?? {}),
    },
    utilities: {
      ...defaults.utilities,
      ...(source?.utilities ?? {}),
    },
    execution: {
      ...defaults.execution,
      ...(source?.execution ?? {}),
    },
    maxSlots: source?.maxSlots ?? defaults.maxSlots,
    maxTotalDigits: source?.maxTotalDigits ?? defaults.maxTotalDigits,
  };
};

const fromSerializableState = (payloadState: SerializableState): GameState => ({
  ...payloadState,
  calculator: {
    ...payloadState.calculator,
    total: parseRational(payloadState.calculator.total),
    pendingNegativeTotal: payloadState.calculator.pendingNegativeTotal ?? false,
    roll: payloadState.calculator.roll.map((value) => parseRational(value)),
    euclidRemainders: (payloadState.calculator.euclidRemainders ?? []).map((entry) => ({
      rollIndex: entry.rollIndex,
      value: parseRational(entry.value),
    })),
    operationSlots: payloadState.calculator.operationSlots.map((slot) => ({
      operator: slot.operator,
      operand: BigInt(slot.operand),
    })),
    draftingSlot: payloadState.calculator.draftingSlot
      ? {
          ...payloadState.calculator.draftingSlot,
          isNegative: payloadState.calculator.draftingSlot.isNegative ?? false,
        }
      : null,
  },
  ui: {
    keyLayout: normalizeKeyLayout(payloadState.ui?.keyLayout),
  },
  unlocks: normalizeUnlocks(payloadState.unlocks),
  completedUnlockIds: payloadState.completedUnlockIds ?? [],
});

export const createLocalStorageRepo = (storage: KeyValueStorage) => ({
  load: (): GameState | null => {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as SavePayload;
      if (!parsed.state) {
        return null;
      }
      if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
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
