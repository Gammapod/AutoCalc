import assert from "node:assert/strict";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import { buildRollDiagnosticsSnapshot } from "../src/domain/diagnostics.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { initialState } from "../src/domain/state.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import type { ContentProvider } from "../src/contracts/contentProvider.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runRollDiagnosticsSnapshotTests = (): void => {
  const base = initialState();

  const emptySnapshot = buildRollDiagnosticsSnapshot(base);
  assert.equal(emptySnapshot.nextOperation.hasPendingOperation, false, "no roll/no pending operation resolves as not pending");
  assert.equal(emptySnapshot.sectionRows.length > 0, true, "snapshot provides renderable section rows");
  assert.equal(emptySnapshot.orbit.growthOrder, "unknown", "default growth order is unknown");

  const draftingBinaryState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: {
        operator: KEY_ID.op_add,
        operandInput: "7",
        isNegative: false,
      },
    },
  };
  const draftingBinary = buildRollDiagnosticsSnapshot(draftingBinaryState);
  assert.equal(draftingBinary.nextOperation.hasPendingOperation, true, "drafting binary is detected as pending");
  assert.equal(draftingBinary.nextOperation.expandedShort.includes("7"), true, "drafting operand token resolves");

  const committedBinaryState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: KEY_ID.op_mul, operand: 5n }],
    },
  };
  const committedBinary = buildRollDiagnosticsSnapshot(committedBinaryState);
  assert.equal(committedBinary.nextOperation.hasPendingOperation, true, "committed binary is detected as pending");
  assert.equal(committedBinary.nextOperation.expandedShort.includes("5"), true, "committed binary operand token resolves");

  const committedUnaryState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
    },
  };
  const committedUnary = buildRollDiagnosticsSnapshot(committedUnaryState);
  assert.equal(committedUnary.nextOperation.hasPendingOperation, true, "committed unary is detected as pending");
  assert.equal(committedUnary.nextOperation.expandedShort.includes("++"), true, "committed unary token resolves");

  const cycleState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [{ y: r(1n) }, { y: r(2n) }, { y: r(3n) }, { y: r(2n) }, { y: r(3n) }],
      rollAnalysis: {
        stopReason: "cycle",
        cycle: {
          i: 1,
          j: 4,
          transientLength: 1,
          periodLength: 3,
        },
      },
    },
  };
  const cycleSnapshot = buildRollDiagnosticsSnapshot(cycleState);
  assert.equal(cycleSnapshot.orbit.cycleDetected, true, "cycle runs set cycle-detected flag");
  assert.equal(cycleSnapshot.orbit.transientLength, 1, "cycle transient length is exposed");
  assert.equal(cycleSnapshot.orbit.periodLength, 3, "cycle period length is exposed");

  const nanState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: toNanCalculatorValue(),
    },
  };
  const nanSnapshot = buildRollDiagnosticsSnapshot(nanState);
  assert.equal(nanSnapshot.domain.category, "symbolic_or_nan", "NaN totals map to symbolic_or_nan category");
  assert.equal(nanSnapshot.domain.text.includes("NaN"), true, "NaN domain text remains non-empty and descriptive");

  const missingTokenContent: ContentProvider["diagnostics"] = {
    ...defaultContentProvider.diagnostics,
    operations: {
      ...defaultContentProvider.diagnostics.operations,
      binary: {
        ...defaultContentProvider.diagnostics.operations.binary,
        [KEY_ID.op_add]: {
          ...defaultContentProvider.diagnostics.operations.binary[KEY_ID.op_add],
          expandedShortTemplate: "{missing_token}",
          expandedLongTemplate: "Long {missing_token}",
        },
      },
    },
  };
  const missingTokenState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: KEY_ID.op_add, operand: 2n }],
    },
  };
  const fallbackSnapshot = buildRollDiagnosticsSnapshot(missingTokenState, missingTokenContent);
  assert.equal(fallbackSnapshot.nextOperation.expandedShort, "_", "missing token short output falls back to underscore");
  assert.equal(fallbackSnapshot.nextOperation.expandedLong.includes("_"), true, "missing token long output falls back to underscore");
};
