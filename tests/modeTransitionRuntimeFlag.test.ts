import assert from "node:assert/strict";
import { resolveModeTransitionRuntimeEnabled } from "../src/app/modeTransitionRuntimeFlag.js";

export const runModeTransitionRuntimeFlagTests = (): void => {
  assert.equal(
    resolveModeTransitionRuntimeEnabled("http://localhost/index.html"),
    false,
    "runtime mode transition defaults to disabled",
  );
  assert.equal(
    resolveModeTransitionRuntimeEnabled("http://localhost/index.html?mode_transition_runtime=1"),
    true,
    "query flag enables runtime mode transition",
  );
  assert.equal(
    resolveModeTransitionRuntimeEnabled("http://localhost/index.html?mode_transition_runtime=true"),
    true,
    "query true token enables runtime mode transition",
  );
  assert.equal(
    resolveModeTransitionRuntimeEnabled("http://localhost/index.html", { MODE_TRANSITION_RUNTIME: "on" }),
    true,
    "env flag enables runtime mode transition when query absent",
  );
  assert.equal(
    resolveModeTransitionRuntimeEnabled(
      "http://localhost/index.html?mode_transition_runtime=0",
      { MODE_TRANSITION_RUNTIME: "on" },
    ),
    false,
    "query value takes precedence over env value",
  );
};

