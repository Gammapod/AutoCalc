import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  isActiveCalculatorScopedAction,
  normalizeLegacyEqualsPress,
  resolveActionCalculatorId,
} from "../src/domain/reducer.pipeline.action.js";
import { materializeCalculatorG, setActiveCalculator } from "../src/domain/multiCalculator.js";
import type { Action } from "../src/domain/types.js";

export const runReducerPipelineActionRoutingTests = (): void => {
  const single = initialState();
  const multi = materializeCalculatorG(initialState());
  const multiActiveG = setActiveCalculator(multi, "g");

  assert.equal(
    resolveActionCalculatorId(single, { type: "PRESS_KEY", key: KEY_ID.digit_1 }),
    "f",
    "single-session scoped action resolves to active calculator",
  );
  assert.equal(
    resolveActionCalculatorId(multiActiveG, { type: "TOGGLE_VISUALIZER", visualizer: "feed" }),
    "g",
    "scoped action resolves to currently active calculator in multi-session",
  );
  assert.equal(
    resolveActionCalculatorId(multi, { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 }),
    null,
    "layout surface-routed actions are not misclassified as active-calculator-scoped",
  );
  assert.equal(
    resolveActionCalculatorId(multi, { type: "PRESS_KEY", key: KEY_ID.digit_2, calculatorId: "g" }),
    "g",
    "explicit calculatorId overrides scoped fallback routing",
  );
  const normalizedEquals = normalizeLegacyEqualsPress({ type: "PRESS_KEY", key: KEY_ID.exec_equals });
  assert.equal(normalizedEquals.type, "TOGGLE_FLAG", "legacy equals press normalizes before routing");
  assert.equal(
    resolveActionCalculatorId(multi, normalizedEquals),
    "f",
    "normalized equals routing resolves active calculator consistently",
  );

  const scopedSamples: Action[] = [
    { type: "PRESS_KEY", key: KEY_ID.digit_1 },
    { type: "TOGGLE_FLAG", flag: "example.flag" },
    { type: "TOGGLE_VISUALIZER", visualizer: "feed" },
    { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
    { type: "AUTO_STEP_TICK" },
  ];
  for (const action of scopedSamples) {
    assert.equal(isActiveCalculatorScopedAction(action), true, `action ${action.type} is marked as active-calculator scoped`);
    assert.equal(
      resolveActionCalculatorId(multiActiveG, action),
      "g",
      `action ${action.type} routing aligns with scoped-action predicate`,
    );
  }
};

