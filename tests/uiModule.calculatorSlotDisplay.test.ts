import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { buildOperationSlotDisplayModel } from "../src/ui/modules/calculator/viewModel.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { materializeCalculator, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import { DELTA_RANGE_CLAMP_FLAG, initialState } from "../src/domain/state.js";
import type { CalculatorId, GameState } from "../src/domain/types.js";
import { k, op } from "./support/keyCompat.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runUiModuleCalculatorSlotDisplayTests = (): void => {
  const base: GameState = {
    ...initialState(),
    calculators: undefined,
  };

  const standard = initialState();
  const withG = projectCalculatorToLegacy(materializeCalculator(standard, "g"), "g");
  const sandbox = createSandboxState();
  const expectedLabels: Array<[CalculatorId, GameState, string, string]> = [
    ["f", standard, "f\u2093 = f\u2093\u208B\u2081", "| f\u2080 = _"],
    ["g", withG, "g\u2093 = g\u2093\u208B\u2081", "| g\u2080 = _"],
    ["f_prime", projectCalculatorToLegacy(sandbox, "f_prime"), "f'\u2093 = f'\u2093\u208B\u2081", "| f'\u2080 = _"],
    ["g_prime", projectCalculatorToLegacy(sandbox, "g_prime"), "g'\u2093 = g'\u2093\u208B\u2081", "| g'\u2080 = _"],
    ["h_prime", projectCalculatorToLegacy(sandbox, "h_prime"), "h'\u2093 = h'\u2093\u208B\u2081", "| h'\u2080 = _"],
    ["i_prime", projectCalculatorToLegacy(sandbox, "i_prime"), "i'\u2093 = i'\u2093\u208B\u2081", "| i'\u2080 = _"],
  ];
  for (const [calculatorId, state, functionPrefix, fixedSeedLabel] of expectedLabels) {
    const display = buildOperationSlotDisplayModel(state);
    assert.equal(display.functionPrefix, functionPrefix, `${calculatorId} function builder prefix matches calculator name`);
    assert.equal(display.fixedSeedLabel, fixedSeedLabel, `${calculatorId} seed label matches calculator name`);
  }

  const withWrapTailTarget: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
      maxTotalDigits: 2,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_step_through") }, { kind: "key", key: k("exec_equals") }],
      keypadColumns: 2,
      keypadRows: 1,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [DELTA_RANGE_CLAMP_FLAG]: true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(99n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      stepProgress: {
        active: true,
        seedTotal: r(99n),
        currentTotal: r(100n),
        nextSlotIndex: 1,
        executedSlotResults: [r(100n)],
      },
    },
  };
  const targetedWrapTail = buildOperationSlotDisplayModel(withWrapTailTarget);
  assert.equal(targetedWrapTail.stepTargetTokenIndex, 1, "step target points to synthetic wrap tail after slot stages");
  assert.equal(Boolean(targetedWrapTail.deltaWrapSuffix), true, "wrap suffix remains visible for trailing wrap stage");
  assert.equal(targetedWrapTail.wrapTail?.kind, "wrapTail", "wrap mode exposes dedicated wrap-tail token");
  assert.equal(targetedWrapTail.slotTokens.length, 1, "slot model emits dedicated slot tokens");
  assert.equal(
    targetedWrapTail.deltaWrapSuffix?.includes("--> [-10\u00B2\u207B\u00B9,10\u00B2\u207B\u00B9)"),
    true,
    "delta wrap suffix renders concrete superscripted boundary interval",
  );

  const withOnlyWrapStage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
      maxTotalDigits: 2,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_step_through") }],
      keypadColumns: 1,
      keypadRows: 1,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [DELTA_RANGE_CLAMP_FLAG]: true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(5n),
      operationSlots: [],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const onlyWrapStage = buildOperationSlotDisplayModel(withOnlyWrapStage);
  assert.equal(onlyWrapStage.stepTargetTokenIndex, 0, "single synthetic wrap stage is targetable when no user slots exist");
  assert.equal(Boolean(onlyWrapStage.deltaWrapSuffix), true, "single-stage wrap rendering appends normalization suffix without removing slot strip");
  assert.equal(
    onlyWrapStage.displayFunctionBase.includes("[ _ _ ]"),
    true,
    "single-stage wrap rendering keeps empty slot placeholders visible",
  );
  assert.equal(
    onlyWrapStage.deltaWrapSuffix?.includes("--> [-10\u00B2\u207B\u00B9,10\u00B2\u207B\u00B9)"),
    true,
    "single-stage wrap rendering keeps canonical wrap suffix visible",
  );
  assert.equal(
    onlyWrapStage.wrapTail?.compactText?.includes("[-10\u00B2\u207B\u00B9,10\u00B2\u207B\u00B9)"),
    true,
    "wrap-tail token includes compact interval variant for responsive compaction",
  );
  assert.equal(
    onlyWrapStage.base.includes("[ _ _ ]"),
    true,
    "single-stage base rendering preserves slot placeholders",
  );

  const withExpansionNoStepKey: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 2,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_equals") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    settings: {
      ...base.settings,
      forecast: "on",
      stepExpansion: "on",
    },
    calculator: {
      ...base.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_add"), operand: 2n }, { operator: op("op_mul"), operand: 3n }],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const expansionNoStepKey = buildOperationSlotDisplayModel(withExpansionNoStepKey);
  assert.equal(
    expansionNoStepKey.stepTargetTokenIndex,
    0,
    "step expansion toggle computes next-operation highlight even when step-through key is absent",
  );
};
