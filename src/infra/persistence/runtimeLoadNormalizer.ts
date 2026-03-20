import { normalizeLoadedStateForRuntime as normalizeDomainLoadedStateForRuntime } from "../../domain/autoEqualsPolicy.js";
import { normalizeRuntimeStateInvariants } from "../../domain/runtimeStateInvariants.js";
import type { GameState } from "../../domain/types.js";

const LEGACY_GREATER_OPERATOR = "op_greater";

const stripLegacyGreaterFromState = (state: GameState): GameState => {
  const scrubLayout = (layout: GameState["ui"]["keyLayout"]): GameState["ui"]["keyLayout"] =>
    layout.map((cell) =>
      cell.kind === "key" && String(cell.key) === LEGACY_GREATER_OPERATOR
        ? { kind: "placeholder", area: "empty" as const }
        : cell,
    );

  const scrubStorage = (storage: GameState["ui"]["storageLayout"]): GameState["ui"]["storageLayout"] =>
    storage.map((cell) => (cell?.kind === "key" && String(cell.key) === LEGACY_GREATER_OPERATOR ? null : cell));

  const scrubOperationSlots = (slots: GameState["calculator"]["operationSlots"]): GameState["calculator"]["operationSlots"] =>
    slots.filter((slot) => !("operand" in slot && String(slot.operator) === LEGACY_GREATER_OPERATOR));

  const scrubDrafting = (drafting: GameState["calculator"]["draftingSlot"]): GameState["calculator"]["draftingSlot"] =>
    drafting && String(drafting.operator) === LEGACY_GREATER_OPERATOR ? null : drafting;

  const scrubCalculator = (calculator: GameState["calculator"]): GameState["calculator"] => ({
    ...calculator,
    operationSlots: scrubOperationSlots(calculator.operationSlots),
    draftingSlot: scrubDrafting(calculator.draftingSlot),
  });

  const scrubUnlocks = {
    ...state.unlocks,
    slotOperators: Object.fromEntries(
      Object.entries(state.unlocks.slotOperators).filter(([key]) => key !== LEGACY_GREATER_OPERATOR),
    ) as GameState["unlocks"]["slotOperators"],
  };

  const scrubKeyPressCounts = Object.fromEntries(
    Object.entries(state.keyPressCounts).filter(([key]) => key !== LEGACY_GREATER_OPERATOR),
  ) as GameState["keyPressCounts"];

  if (!state.calculators) {
    return {
      ...state,
      calculator: scrubCalculator(state.calculator),
      keyPressCounts: scrubKeyPressCounts,
      unlocks: scrubUnlocks,
      ui: {
        ...state.ui,
        keyLayout: scrubLayout(state.ui.keyLayout),
        storageLayout: scrubStorage(state.ui.storageLayout),
      },
    };
  }

  const f = state.calculators.f;
  const g = state.calculators.g;
  return {
    ...state,
    calculator: scrubCalculator(state.calculator),
    keyPressCounts: scrubKeyPressCounts,
    unlocks: scrubUnlocks,
    ui: {
      ...state.ui,
      keyLayout: scrubLayout(state.ui.keyLayout),
      storageLayout: scrubStorage(state.ui.storageLayout),
    },
    calculators: {
      ...state.calculators,
      ...(f
        ? {
          f: {
            ...f,
            calculator: scrubCalculator(f.calculator),
            ui: {
              ...f.ui,
              keyLayout: scrubLayout(f.ui.keyLayout),
              storageLayout: scrubStorage(f.ui.storageLayout),
            },
          },
        }
        : {}),
      ...(g
        ? {
          g: {
            ...g,
            calculator: scrubCalculator(g.calculator),
            ui: {
              ...g.ui,
              keyLayout: scrubLayout(g.ui.keyLayout),
              storageLayout: scrubStorage(g.ui.storageLayout),
            },
          },
        }
        : {}),
    },
  };
};

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  loaded
    ? (() => {
      const normalized = normalizeDomainLoadedStateForRuntime(loaded);
      return normalized ? normalizeRuntimeStateInvariants(stripLegacyGreaterFromState(normalized)) : null;
    })()
    : loaded;
