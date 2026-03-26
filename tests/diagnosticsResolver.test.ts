import assert from "node:assert/strict";
import { resolveLastKeyDiagnostic, resolveNextOperationDiagnostic } from "../src/domain/diagnostics.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import type { ContentProvider } from "../src/contracts/contentProvider.js";
import type { GameState } from "../src/domain/types.js";

const withLastAction = (
  state: GameState,
  patch: Partial<GameState["ui"]["diagnostics"]["lastAction"]>,
): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    diagnostics: {
      lastAction: {
        ...state.ui.diagnostics.lastAction,
        ...patch,
      },
    },
  },
});

export const runDiagnosticsResolverTests = (): void => {
  const content = defaultContentProvider.diagnostics;
  const base = initialState();

  const pressKeyState = withLastAction(base, {
    sequence: 1,
    actionKind: "press_key",
    keyId: KEY_ID.op_add,
    operatorId: KEY_ID.op_add,
  });
  const lastKeyPress = resolveLastKeyDiagnostic(pressKeyState, content);
  assert.ok(lastKeyPress.short.includes("+"), "last key press resolves key-face token");
  assert.ok(lastKeyPress.long.length > 0, "last key press long description resolves");

  const visualizerState = withLastAction(base, {
    sequence: 2,
    actionKind: "toggle_visualizer",
    keyId: KEY_ID.viz_factorization,
    visualizerToggled: true,
  });
  const lastKeyVisualizer = resolveLastKeyDiagnostic(visualizerState, content);
  assert.equal(lastKeyVisualizer.caveats.length > 0, true, "visualizer key diagnostics include caveat lines");

  const noEffectState = withLastAction(base, {
    sequence: 3,
    actionKind: "press_key",
    keyId: KEY_ID.util_undo,
    noEffect: true,
    blocked: true,
  });
  const lastKeyNoEffect = resolveLastKeyDiagnostic(noEffectState, content);
  assert.equal(lastKeyNoEffect.short.length > 0, true, "no-effect trace still resolves non-empty short output");

  const customContent: ContentProvider["diagnostics"] = {
    ...content,
    keys: {
      ...content.keys,
      [KEY_ID.digit_1]: {
        title: "Custom",
        shortTemplate: "{unknown_token}",
      },
    },
  };
  const customKeyState = withLastAction(base, {
    sequence: 4,
    actionKind: "press_key",
    keyId: KEY_ID.digit_1,
  });
  const customResolved = resolveLastKeyDiagnostic(customKeyState, customContent);
  assert.equal(customResolved.short, "_", "missing key tokens are deterministically replaced with underscore");
  assert.equal(customResolved.long, "_", "missing optional long template falls back to short template");

  const noPending = resolveNextOperationDiagnostic(base, content);
  assert.equal(noPending.hasPendingOperation, false, "next operation reports no-pending path");
  assert.equal(noPending.expandedShort.length > 0, true, "no-pending still returns stable output");

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
  const draftingBinary = resolveNextOperationDiagnostic(draftingBinaryState, content);
  assert.equal(draftingBinary.hasPendingOperation, true, "drafting binary operation is recognized as pending");
  assert.equal(draftingBinary.expandedShort.includes("7"), true, "drafting binary operand token resolves");

  const committedBinaryState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: KEY_ID.op_mul, operand: 5n }],
    },
  };
  const committedBinary = resolveNextOperationDiagnostic(committedBinaryState, content);
  assert.equal(committedBinary.hasPendingOperation, true, "committed binary operation is recognized as pending");
  assert.equal(committedBinary.expandedShort.includes("5"), true, "committed binary operand token resolves");

  const committedUnaryState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ kind: "unary", operator: KEY_ID.unary_inc }],
    },
  };
  const committedUnary = resolveNextOperationDiagnostic(committedUnaryState, content);
  assert.equal(committedUnary.hasPendingOperation, true, "committed unary operation is recognized as pending");
  assert.equal(committedUnary.expandedShort.includes("++"), true, "committed unary face token resolves");

  const fallbackTokenContent: ContentProvider["diagnostics"] = {
    ...content,
    operations: {
      ...content.operations,
      binary: {
        ...content.operations.binary,
        [KEY_ID.op_add]: {
          ...content.operations.binary[KEY_ID.op_add],
          expandedLongTemplate: "Long {missing_token}",
        },
      },
    },
  };
  const fallbackTokenState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: KEY_ID.op_add, operand: 2n }],
    },
  };
  const fallbackLong = resolveNextOperationDiagnostic(fallbackTokenState, fallbackTokenContent);
  assert.equal(fallbackLong.expandedLong.includes("_"), true, "missing operation tokens resolve to underscore");
};

