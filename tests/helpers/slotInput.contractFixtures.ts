import "../support/keyCompat.runtime.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../../src/domain/calculatorValue.js";
import { resolveKeyId, type KeyLike } from "../../src/domain/keyPresentation.js";
import { initialState } from "../../src/domain/state.js";
import { legacyInitialState } from "../support/legacyState.js";
import type { ErrorCode, ExecutionErrorKind, GameState, KeyInput, RollEntry } from "../../src/domain/types.js";
import { keyCounts, op } from "../support/keyCompat.js";

export type SlotInputScenarioTag = "legacy_contract" | "target_spec";

export type SlotInputStateProjection = {
  total?: GameState["calculator"]["total"];
  operationSlots?: GameState["calculator"]["operationSlots"];
  draftingSlot?: GameState["calculator"]["draftingSlot"];
  roll?: GameState["calculator"]["total"][];
  rollErrors?: Array<{ rollIndex: number; code: ErrorCode; kind: ExecutionErrorKind }>;
  keyPressCounts?: Partial<Record<KeyLike, number>>;
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
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

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

const base = legacyInitialState();

export const slotInputScenarios: readonly SlotInputScenario[] = [
  {
    id: "legacy.start_drafting_and_digit",
    description: "Operator starts drafting; digit fills drafting operand.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(base, ["+", "1"]),
    keySequence: ["+", "1"],
    expectedProjection: {
      operationSlots: [],
      draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
      roll: [],
      keyPressCounts: keyCounts([["+", 1], ["1", 1]]),
    },
  },
  {
    id: "legacy.equals_clears_empty_drafting_slot",
    description: "Executing with half-filled slot drops drafting slot and executes committed slots only.",
    tags: ["legacy_contract", "target_spec"],
    initialState: withUnlockedKeys(base, ["+", "="]),
    keySequence: ["+", "="],
    expectedProjection: {
      operationSlots: [],
      draftingSlot: null,
      total: r(0n),
      roll: [r(0n)],
      keyPressCounts: keyCounts([["+", 1], ["=", 1]]),
    },
    targetProjection: {
      draftingSlot: null,
    },
  },
  {
    id: "target.replace_operator_on_empty_operand",
    description: "Desired: if drafting has operator and empty operand, new operator replaces it.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(base, ["+", "-"]),
    keySequence: ["+", "-"],
    targetProjection: {
      operationSlots: [],
      draftingSlot: { operator: op("-"), operandInput: "", isNegative: false },
      keyPressCounts: keyCounts([["+", 1], ["-", 1]]),
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
          operationSlots: [{ operator: op("+"), operand: 1n }],
          draftingSlot: null,
        },
      },
      ["2"],
    ),
    keySequence: ["2"],
    targetProjection: {
      total: r(0n),
      operationSlots: [{ operator: op("+"), operand: 2n }],
      draftingSlot: null,
      roll: [],
      keyPressCounts: keyCounts([["2", 1]]),
    },
  },
  {
    id: "target.digit_replaces_filled_drafting_operand",
    description: "Desired: typing another digit into a filled drafting operand replaces it.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(base, ["+", "1", "2"]),
    keySequence: ["+", "1", "2"],
    targetProjection: {
      operationSlots: [],
      draftingSlot: { operator: op("+"), operandInput: "2", isNegative: false },
      roll: [],
      keyPressCounts: keyCounts([["+", 1], ["1", 1], ["2", 1]]),
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
      ["+", "1"],
    ),
    keySequence: ["+", "1", "1"],
    targetProjection: {
      total: r(3n),
      operationSlots: [],
      draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
      roll: [],
      keyPressCounts: keyCounts([["+", 1], ["1", 2]]),
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
      ["1", "2"],
    ),
    keySequence: ["1", "2"],
    targetProjection: {
      total: r(2n),
      operationSlots: [],
      draftingSlot: null,
      roll: [],
      keyPressCounts: keyCounts([["1", 1], ["2", 1]]),
    },
  },
  {
    id: "legacy.c_resets_calculator",
    description: "C clears roll/slots/drafting and resets total.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(7n),
          rollEntries: re(r(5n), r(7n)),
          operationSlots: [{ operator: op("-"), operand: 2n }],
          draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
        },
      },
      ["C"],
    ),
    keySequence: ["C"],
    expectedProjection: {
      total: r(0n),
      roll: [],
      operationSlots: [],
      draftingSlot: null,
      keyPressCounts: keyCounts([["C", 1]]),
    },
  },
  {
    id: "legacy.left_to_right_execution",
    description: "Committed slots execute left-to-right with starting total recorded when roll is empty.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          maxTotalDigits: 3,
        },
        calculator: {
          ...base.calculator,
          total: r(10n),
          operationSlots: [
            { operator: op("-"), operand: 2n },
            { operator: op("*"), operand: 3n },
          ],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: r(24n),
      operationSlots: [
        { operator: op("-"), operand: 2n },
        { operator: op("*"), operand: 3n },
      ],
      roll: [r(24n)],
      keyPressCounts: keyCounts([["=", 1]]),
    },
  },
  {
    id: "legacy.division_by_zero_execution_error",
    description: "Division by zero writes NaN total and roll error.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(10n),
          operationSlots: [{ operator: op("/"), operand: 0n }],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: toNanCalculatorValue(),
      roll: [toNanCalculatorValue()],
      rollErrors: [{ rollIndex: 0, code: "n/0", kind: "division_by_zero" }],
      keyPressCounts: keyCounts([["=", 1]]),
    },
  },
  {
    id: "legacy.overflow_clamp_execution_error",
    description: "Overflow clamps to boundary and records overflow error.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          maxTotalDigits: 2,
        },
        calculator: {
          ...base.calculator,
          total: r(99n),
          operationSlots: [{ operator: op("+"), operand: 1n }],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: r(99n),
      rollErrors: [{ rollIndex: 0, code: "x∉[-R,R]", kind: "overflow" }],
      keyPressCounts: keyCounts([["=", 1]]),
    },
  },
  {
    id: "legacy.roll_digit_noop_with_active_roll",
    description: "Digit press with active roll is a no-op.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(5n),
          rollEntries: re(r(5n)),
        },
      },
      ["1"],
    ),
    keySequence: ["1"],
    expectedProjection: {
      total: r(5n),
      roll: [r(5n)],
      operationSlots: [],
      draftingSlot: null,
      keyPressCounts: keyCounts([]),
    },
  },
  {
    id: "legacy.roll_operator_preprocess_clears_entry",
    description: "Operator press with active roll clears entry then starts drafting.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(5n),
          rollEntries: re(r(5n)),
          operationSlots: [{ operator: op("+"), operand: 2n }],
        },
      },
      ["-"],
    ),
    keySequence: ["-"],
    expectedProjection: {
      total: r(5n),
      roll: [],
      operationSlots: [],
      draftingSlot: { operator: op("-"), operandInput: "", isNegative: false },
      keyPressCounts: keyCounts([["-", 1]]),
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
          draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
        },
      },
      ["-"],
    ),
    keySequence: ["-"],
    targetProjection: {
      operationSlots: [{ kind: "binary", operator: op("+"), operand: 1n }],
      draftingSlot: null,
      keyPressCounts: keyCounts([["-", 1]]),
    },
  },
];

export const getSlotInputScenariosByTag = (tag: SlotInputScenarioTag): SlotInputScenario[] =>
  slotInputScenarios.filter((scenario) => scenario.tags.includes(tag));





