import { toNanCalculatorValue, toRationalCalculatorValue } from "../../src/domain/calculatorValue.js";
import { initialState } from "../../src/domain/state.js";
import type { GameState, Key } from "../../src/domain/types.js";

export type SlotInputScenarioTag = "legacy_contract" | "target_spec";

export type SlotInputStateProjection = {
  total?: GameState["calculator"]["total"];
  operationSlots?: GameState["calculator"]["operationSlots"];
  draftingSlot?: GameState["calculator"]["draftingSlot"];
  roll?: GameState["calculator"]["roll"];
  rollErrors?: GameState["calculator"]["rollErrors"];
  keyPressCounts?: Partial<Record<Key, number>>;
};

export type SlotInputScenario = {
  id: string;
  description: string;
  tags: readonly SlotInputScenarioTag[];
  initialState: GameState;
  keySequence: readonly Key[];
  expectedProjection?: SlotInputStateProjection;
  targetProjection?: SlotInputStateProjection;
};

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const withUnlockedKeys = (state: GameState, keys: readonly Key[]): GameState => {
  let next = state;
  for (const key of keys) {
    if (key in next.unlocks.valueExpression) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          valueExpression: {
            ...next.unlocks.valueExpression,
            [key]: true,
          },
        },
      };
      continue;
    }
    if (key in next.unlocks.slotOperators) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          maxSlots: Math.max(next.unlocks.maxSlots, 1),
          slotOperators: {
            ...next.unlocks.slotOperators,
            [key]: true,
          },
        },
      };
      continue;
    }
    if (key in next.unlocks.utilities) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          utilities: {
            ...next.unlocks.utilities,
            [key]: true,
          },
        },
      };
      continue;
    }
    if (key in next.unlocks.steps) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          steps: {
            ...next.unlocks.steps,
            [key]: true,
          },
        },
      };
      continue;
    }
    if (key in next.unlocks.visualizers) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          visualizers: {
            ...next.unlocks.visualizers,
            [key]: true,
          },
        },
      };
      continue;
    }
    if (key in next.unlocks.execution) {
      next = {
        ...next,
        unlocks: {
          ...next.unlocks,
          execution: {
            ...next.unlocks.execution,
            [key]: true,
          },
        },
      };
    }
  }
  return next;
};

const base = initialState();

export const slotInputScenarios: readonly SlotInputScenario[] = [
  {
    id: "legacy.start_drafting_and_digit",
    description: "Operator starts drafting; digit fills drafting operand.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(base, ["+", "1"]),
    keySequence: ["+", "1"],
    expectedProjection: {
      operationSlots: [],
      draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
      roll: [],
      keyPressCounts: { "+": 1, "1": 1 },
    },
  },
  {
    id: "legacy.negates_drafting_operand",
    description: "NEG toggles drafting sign and digit uses signed drafting operand.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(base, ["+", "NEG", "1"]),
    keySequence: ["+", "NEG", "1"],
    expectedProjection: {
      operationSlots: [],
      draftingSlot: { operator: "+", operandInput: "1", isNegative: true },
      roll: [],
      keyPressCounts: { "+": 1, NEG: 1, "1": 1 },
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
      keyPressCounts: { "+": 1, "=": 1 },
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
      draftingSlot: { operator: "-", operandInput: "", isNegative: false },
      keyPressCounts: { "+": 1, "-": 1 },
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
          operationSlots: [{ operator: "+", operand: 1n }],
          draftingSlot: null,
        },
      },
      ["2"],
    ),
    keySequence: ["2"],
    targetProjection: {
      total: r(0n),
      operationSlots: [{ operator: "+", operand: 2n }],
      draftingSlot: null,
      roll: [],
      keyPressCounts: { "2": 1 },
    },
  },
  {
    id: "target.neg_toggles_current_filled_slot_sign",
    description: "Desired: NEG toggles sign on current filled slot operand.",
    tags: ["target_spec"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(0n),
          operationSlots: [{ operator: "+", operand: 2n }],
          draftingSlot: null,
        },
      },
      ["NEG"],
    ),
    keySequence: ["NEG"],
    targetProjection: {
      total: r(0n),
      operationSlots: [{ operator: "+", operand: -2n }],
      draftingSlot: null,
      roll: [],
      keyPressCounts: { NEG: 1 },
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
      draftingSlot: { operator: "+", operandInput: "2", isNegative: false },
      roll: [],
      keyPressCounts: { "+": 1, "1": 1, "2": 1 },
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
      draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
      roll: [],
      keyPressCounts: { "+": 1, "1": 2 },
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
      keyPressCounts: { "1": 1, "2": 1 },
    },
  },
  {
    id: "legacy.ce_clears_entry_preserves_total",
    description: "CE clears roll/slots/drafting while preserving total.",
    tags: ["legacy_contract"],
    initialState: withUnlockedKeys(
      {
        ...base,
        calculator: {
          ...base.calculator,
          total: r(7n),
          roll: [r(5n), r(7n)],
          operationSlots: [{ operator: "-", operand: 2n }],
          draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
        },
      },
      ["CE"],
    ),
    keySequence: ["CE"],
    expectedProjection: {
      total: r(7n),
      roll: [],
      operationSlots: [],
      draftingSlot: null,
      keyPressCounts: { CE: 1 },
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
            { operator: "-", operand: 2n },
            { operator: "*", operand: 3n },
          ],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: r(24n),
      operationSlots: [
        { operator: "-", operand: 2n },
        { operator: "*", operand: 3n },
      ],
      roll: [r(10n), r(24n)],
      keyPressCounts: { "=": 1 },
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
          operationSlots: [{ operator: "/", operand: 0n }],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: toNanCalculatorValue(),
      roll: [r(10n), toNanCalculatorValue()],
      rollErrors: [{ rollIndex: 1, code: "n/0", kind: "division_by_zero" }],
      keyPressCounts: { "=": 1 },
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
          operationSlots: [{ operator: "+", operand: 1n }],
        },
      },
      ["="],
    ),
    keySequence: ["="],
    expectedProjection: {
      total: r(99n),
      rollErrors: [{ rollIndex: 1, code: "x∉[-R,R]", kind: "overflow" }],
      keyPressCounts: { "=": 1 },
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
          roll: [r(5n)],
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
      keyPressCounts: {},
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
          roll: [r(5n)],
          operationSlots: [{ operator: "+", operand: 2n }],
        },
      },
      ["-"],
    ),
    keySequence: ["-"],
    expectedProjection: {
      total: r(5n),
      roll: [],
      operationSlots: [],
      draftingSlot: { operator: "-", operandInput: "", isNegative: false },
      keyPressCounts: { "-": 1 },
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
          draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
        },
      },
      ["-"],
    ),
    keySequence: ["-"],
    targetProjection: {
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: null,
      keyPressCounts: { "-": 1 },
    },
  },
];

export const getSlotInputScenariosByTag = (tag: SlotInputScenarioTag): SlotInputScenario[] =>
  slotInputScenarios.filter((scenario) => scenario.tags.includes(tag));
