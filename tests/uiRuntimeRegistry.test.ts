import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  runtimeA.calculator.moduleState = { sample: "a" } as unknown as typeof runtimeA.calculator.moduleState;
  runtimeA.grapher.moduleState = { sample: "graph-a" } as unknown as typeof runtimeA.grapher.moduleState;
  runtimeA.shell.renderer = null;
  assert.equal(runtimeB.calculator.moduleState, null, "state does not leak between roots");
  assert.equal(runtimeB.grapher.moduleState, null, "grapher state does not leak between roots");
  assert.equal(runtimeB.shell.renderer, null, "shell state does not leak between roots");

  disposeRuntime(rootA);
  const runtimeARecreated = getOrCreateRuntime(rootA);
  assert.notEqual(runtimeARecreated, runtimeA, "dispose removes runtime and recreates cleanly");
  assert.equal(runtimeARecreated.calculator.moduleState, null, "recreated runtime is clean");
  assert.equal(runtimeARecreated.grapher.moduleState, null, "recreated grapher runtime is clean");
  assert.equal(runtimeARecreated.shell.renderer, null, "recreated shell runtime is clean");

  const harnessA = installDomHarness("http://localhost:4173/index.html");
  const harnessB = installDomHarness("http://localhost:4173/index.html");
  try {
    render(harnessA.root, initialState(), noopDispatch, {
            inputBlocked: false,
    });
    render(harnessB.root, initialState(), noopDispatch, {
            inputBlocked: false,
    });
    const runtimeAfterA = getOrCreateRuntime(harnessA.root);
    const runtimeAfterB = getOrCreateRuntime(harnessB.root);
    assert.notEqual(runtimeAfterA, runtimeAfterB, "renderer runtime is scoped by root");
    assert.notEqual(
      runtimeAfterA.calculator.moduleState,
      runtimeAfterB.calculator.moduleState,
      "calculator runtime state bag is not shared",
    );
    assert.notEqual(
      runtimeAfterA.grapher,
      runtimeAfterB.grapher,
      "grapher runtime container is root-scoped",
    );
    assert.notEqual(
      runtimeAfterA.shell,
      runtimeAfterB.shell,
      "shell runtime container is root-scoped",
    );
  } finally {
    harness.teardown();
    harnessA.teardown();
    harnessB.teardown();
  }

  resetAllUiRuntimeForTests();

  const legacyMonolithToken = "calculator" + "ModuleRenderer";
  const collectFiles = (dir: string): string[] => {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath));
        continue;
      }
      if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const sourceFiles = [...collectFiles(resolve(process.cwd(), "src")), ...collectFiles(resolve(process.cwd(), "tests"))];
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    assert.equal(
      source.includes(legacyMonolithToken),
      false,
      `legacy monolith token removed from ${file}`,
    );
  }
};


