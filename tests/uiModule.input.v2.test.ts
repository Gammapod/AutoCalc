import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initialState } from "../src/domain/state.js";
import { legacyInitialState } from "./support/legacyState.js";
import { classifyDropAction, shouldStartDragFromDelta } from "../src/ui/modules/input/dragDrop.js";
import {
  beginInputAnimationLock,
  resetInputLockStateForTests,
  setSuppressClicksUntilForTests,
  shouldSuppressClickForTests,
} from "../src/ui/modules/input/pressFeedback.js";
import { renderInputV2Module } from "../src/ui/modules/input/render.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = () => ({ type: "RESET_RUN" as const });

export const runUiModuleInputV2Tests = (): void => {
  assert.equal(shouldStartDragFromDelta(2, 2, 6), false, "input drag threshold rejects small moves");
  assert.equal(shouldStartDragFromDelta(6, 0, 6), true, "input drag threshold accepts threshold crossing");

  const state = legacyInitialState();
  const withStorageKey = {
    ...state,
    unlocks: {
      ...state.unlocks,
      uiUnlocks: {
        ...state.unlocks.uiUnlocks,
        storageVisible: true,
      },
      valueExpression: {
        ...state.unlocks.valueExpression,
        "digit_1": true,
      },
    },
    ui: {
      ...state.ui,
      keyLayout: [
        ...state.ui.keyLayout,
        { kind: "placeholder", area: "empty" } as const,
        { kind: "placeholder", area: "empty" } as const,
        { kind: "placeholder", area: "empty" } as const,
        { kind: "placeholder", area: "empty" } as const,
      ],
      keypadColumns: 5,
      keypadRows: 1,
      storageLayout: [{ kind: "key", key: k("digit_1") } as const, ...state.ui.storageLayout.slice(1)],
    },
  };
  const action = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(action === "move" || action === null, true, "input drag-drop adapter delegates to layout rules");

  const now = Date.now();
  setSuppressClicksUntilForTests(now + 200);
  assert.equal(shouldSuppressClickForTests(), true, "suppression helper reports active suppression window");
  setSuppressClicksUntilForTests(now - 1);
  assert.equal(shouldSuppressClickForTests(), false, "suppression helper clears after window");

  const releaseA = beginInputAnimationLock(0);
  const releaseB = beginInputAnimationLock(0);
  assert.equal(shouldSuppressClickForTests(), true, "animation lock suppresses clicks");
  releaseA();
  assert.equal(shouldSuppressClickForTests(), true, "suppression stays active until all locks release");
  releaseB();
  assert.equal(shouldSuppressClickForTests(), false, "suppression clears after final lock release");

  const harness = installDomHarness("http://localhost:4173/index.html");
  try {
    renderInputV2Module(harness.root, state, noopDispatch, {
            inputBlocked: false,
    });
  } finally {
    harness.teardown();
  }

  const dragDropSource = readFileSync(
    resolve(process.cwd(), "src/ui/modules/input/dragDrop.ts"),
    "utf8",
  );
  const pressFeedbackSource = readFileSync(
    resolve(process.cwd(), "src/ui/modules/input/pressFeedback.ts"),
    "utf8",
  );
  const legacyMonolithToken = "calculator" + "ModuleRenderer";
  assert.equal(
    dragDropSource.includes(legacyMonolithToken),
    false,
    "input drag-drop module does not import the legacy monolith renderer",
  );
  assert.equal(
    pressFeedbackSource.includes(legacyMonolithToken),
    false,
    "input press feedback module does not import the legacy monolith renderer",
  );

  resetInputLockStateForTests();
};







