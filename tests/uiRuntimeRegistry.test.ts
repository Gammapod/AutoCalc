import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderCalculatorV2Module as render } from "../src/ui/modules/calculator/render.js";
import { disposeRuntime, getOrCreateRuntime, resetAllUiRuntimeForTests } from "../src/ui/runtime/registry.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = () => ({ type: "RESET_RUN" as const });

export const runUiRuntimeRegistryTests = (): void => {
  const harness = installDomHarness("http://localhost:4173/index.html");
  const rootA = harness.document.createElement("div");
  const rootB = harness.document.createElement("div");
  const runtimeA = getOrCreateRuntime(rootA);
  const runtimeB = getOrCreateRuntime(rootB);
  assert.notEqual(runtimeA, runtimeB, "different roots get different runtimes");
  runtimeA.calculator.state.sample = "a";
  assert.equal(runtimeB.calculator.state.sample, undefined, "state does not leak between roots");

  disposeRuntime(rootA);
  const runtimeARecreated = getOrCreateRuntime(rootA);
  assert.notEqual(runtimeARecreated, runtimeA, "dispose removes runtime and recreates cleanly");
  assert.equal(runtimeARecreated.calculator.state.sample, undefined, "recreated runtime is clean");

  const harnessA = installDomHarness("http://localhost:4173/index.html");
  const harnessB = installDomHarness("http://localhost:4173/index.html");
  try {
    render(harnessA.root, initialState(), noopDispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    render(harnessB.root, initialState(), noopDispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    const runtimeAfterA = getOrCreateRuntime(harnessA.root);
    const runtimeAfterB = getOrCreateRuntime(harnessB.root);
    assert.notEqual(runtimeAfterA, runtimeAfterB, "renderer runtime is scoped by root");
    assert.notEqual(
      runtimeAfterA.calculator.state,
      runtimeAfterB.calculator.state,
      "calculator runtime state bag is not shared",
    );
  } finally {
    harness.teardown();
    harnessA.teardown();
    harnessB.teardown();
  }

  resetAllUiRuntimeForTests();
};
