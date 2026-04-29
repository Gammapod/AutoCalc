import "../support/keyCompat.runtime.js";
import { toRationalCalculatorValue } from "../../src/domain/calculatorValue.js";
import { resolveKeyId, type KeyId } from "../../src/domain/keyPresentation.js";
import { initialState } from "../../src/domain/state.js";
import type { ErrorCode, ExecutionErrorKind, GameState, KeyInput } from "../../src/domain/types.js";
import { keyCounts, op } from "../support/keyCompat.js";

export type SlotInputScenarioTag = "target_spec";

export type SlotInputStateProjection = {
  total?: GameState["calculator"]["total"];
  operationSlots?: GameState["calculator"]["operationSlots"];
  draftingSlot?: GameState["calculator"]["draftingSlot"];
  roll?: GameState["calculator"]["total"][];
  rollErrors?: Array<{ rollIndex: number; code: ErrorCode; kind: ExecutionErrorKind }>;
  keyPressCounts?: Partial<Record<KeyId, number>>;
};

export type SlotInputScenario = {
  id: string;
  description: string;
  tags: readonly SlotInputScenarioTag[];
  initialState: GameState;
  keySequence: readonly KeyInput[];
  expectedProjection?: SlotInputStateProjection;
  targetProjection?: SlotInputStateProjection;
};

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const ensureKeyOnKeypad = (state: GameState, key: KeyInput): GameState => {
  const keyId = resolveKeyId(key);
  if (state.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === keyId)) {
    return state;
  }
  const placeholderIndex = state.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  if (placeholderIndex >= 0) {
    return {
      ...state,
      ui: {
        ...state.ui,
        keyLayout: state.ui.keyLayout.map((cell, index) =>
          index === placeholderIndex ? { kind: "key", key: keyId } : cell),
      },
    };
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: [...state.ui.keyLayout, { kind: "key", key: keyId }],
      keypadColumns: state.ui.keypadColumns + 1,
      keypadRows: 1,
    },
  };
};

const withUnlockedKeys = (state: GameState, keys: readonly KeyInput[]): GameState => {
  let next = state;
  for (const key of keys) {
    const keyId = resolveKeyId(key);
    if (keyId in next.unlocks.valueAtoms || keyId in next.unlocks.valueCompose || keyId in next.unlocks.valueExpression) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          valueAtoms: keyId in next.unlocks.valueAtoms
            ? {
              ...next.unlocks.valueAtoms,
              [keyId]: true,
            }
            : next.unlocks.valueAtoms,
          valueCompose: keyId in next.unlocks.valueCompose
            ? {
              ...next.unlocks.valueCompose,
              [keyId]: true,
            }
            : next.unlocks.valueCompose,
          valueExpression: {
            ...next.unlocks.valueExpression,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.slotOperators) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          maxSlots: Math.max(next.unlocks.maxSlots, 1),
          slotOperators: {
            ...next.unlocks.slotOperators,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.utilities) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          utilities: {
            ...next.unlocks.utilities,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.unaryOperators) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          maxSlots: Math.max(next.unlocks.maxSlots, 1),
          unaryOperators: {
            ...next.unlocks.unaryOperators,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.memory) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          memory: {
            ...next.unlocks.memory,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.steps) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          steps: {
            ...next.unlocks.steps,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.visualizers) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          visualizers: {
            ...next.unlocks.visualizers,
            [keyId]: true,
          },
        },
      };
      continue;
    }
    if (keyId in next.unlocks.execution) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          execution: {
            ...next.unlocks.execution,
            [keyId]: true,
          },
        },
      };
    }
    next = ensureKeyOnKeypad(next, keyId);
  }
  return next;
};

const base = initialState();

export const slotInputScenarios: readonly SlotInputScenario[] = [
  {
    id: "target.equals_clears_empty_drafting_slot",
    description: "Executing with half-filled slot drops drafting slot and executes committed slots only.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(base, ["op_add", "exec_equals"]),
    keySequence: ["op_add", "exec_equals"],
    targetProjection: {
      draftingSlot: null,
    },
  },
  {
    id: "target.replace_operator_on_empty_operand",
    description: "Desired: if drafting has operator and empty operand, new operator replaces it.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(base, ["op_add", "op_sub"]),
    keySequence: ["op_add", "op_sub"],
    targetProjection: {
      operationSlots: [],
      draftingSlot: { operator: op("op_sub"), operandInput: "", isNegative: false },
      keyPressCounts: keyCounts([["op_add", 1], ["op_sub", 1]]),
    },
  },
  {
    id: "target.value_edits_current_filled_slot_before_next_started",
    description: "Desired: value keys keep editing current slot operand when next slot not started.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(0n),
          operationSlots: [{ operator: op("op_add"), operand: 1n }],
          draftingSlot: null,
        },
      },
      ["digit_2"],
    ),
    keySequence: ["digit_2"],
    targetProjection: {
      total: r(0n),
      operationSlots: [{ operator: op("op_add"), operand: 2n }],
      draftingSlot: null,
      roll: [r(0n)],
      keyPressCounts: keyCounts([["digit_2", 1]]),
    },
  },
  {
    id: "target.digit_replaces_filled_drafting_operand",
    description: "Desired: typing another digit into a filled drafting operand replaces it.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(base, ["op_add", "digit_1", "digit_2"]),
    keySequence: ["op_add", "digit_1", "digit_2"],
    targetProjection: {
      operationSlots: [],
      draftingSlot: { operator: op("op_add"), operandInput: "2", isNegative: false },
      roll: [r(0n)],
      keyPressCounts: keyCounts([["op_add", 1], ["digit_1", 1], ["digit_2", 1]]),
    },
  },
  {
    id: "target.same_digit_keeps_filled_drafting_operand_without_seed_fallback",
    description: "Desired: same digit on filled drafting operand stays on operand and never falls back to seed edit.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          maxTotalDigits: 2,
        },
        calculator: {
          ...base.calculator,
          total: r(3n),
        },
      },
      ["op_add", "digit_1"],
    ),
    keySequence: ["op_add", "digit_1", "digit_1"],
    targetProjection: {
      total: r(3n),
      operationSlots: [],
      draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: false },
      roll: [r(3n)],
      keyPressCounts: keyCounts([["op_add", 1], ["digit_1", 2]]),
    },
  },
  {
    id: "target.second_seed_digit_replaces_first_seed_digit",
    description: "Desired: entering a second seed digit replaces the first seed digit.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          maxTotalDigits: 2,
        },
        calculator: {
          ...base.calculator,
          singleDigitInitialTotalEntry: true,
        },
      },
      ["digit_1", "digit_2"],
    ),
    keySequence: ["digit_1", "digit_2"],
    targetProjection: {
      total: r(2n),
      operationSlots: [],
      draftingSlot: null,
      roll: [],
      keyPressCounts: keyCounts([["digit_1", 1], ["digit_2", 1]]),
    },
  },
  {
    id: "target.capacity_boundary_commits_without_new_draft",
    description: "Desired: at max slot boundary, filled drafting commits and no new drafting starts.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: false },
        },
      },
      ["op_sub"],
    ),
    keySequence: ["op_sub"],
    targetProjection: {
      operationSlots: [{ kind: "binary", operator: op("op_add"), operand: 1n }],
      draftingSlot: null,
      keyPressCounts: keyCounts([["op_sub", 1]]),
    },
  },
];

export const getSlotInputScenariosByTag = (tag: SlotInputScenarioTag): SlotInputScenario[] =>
  slotInputScenarios.filter((scenario) => scenario.tags.includes(tag));




