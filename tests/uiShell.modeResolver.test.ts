import assert from "node:assert/strict";
import { resolveUiShellMode } from "../src/app/uiShellMode.js";

export const runUiShellModeResolverTests = (): void => {
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=legacy", { UI_SHELL_TARGET: "mobile" }),
    "legacy",
    "query override forces legacy even when env requests mobile",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=mobile", { UI_SHELL_TARGET: "legacy" }),
    "mobile",
    "query override forces mobile even when env requests legacy",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=desktop", { UI_SHELL_TARGET: "mobile" }),
    "desktop",
    "query override forces desktop even when env requests mobile",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { UI_SHELL_TARGET: "legacy" }),
    "legacy",
    "UI_SHELL_TARGET legacy is honored when query is absent",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { UI_SHELL_TARGET: "desktop" }),
    "desktop",
    "UI_SHELL_TARGET desktop is honored when query is absent",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { UI_SHELL_TARGET: "mobile" }),
    "mobile",
    "UI_SHELL_TARGET mobile is honored when query is absent",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=v1", { UI_SHELL_TARGET: "desktop" }),
    "legacy",
    "v1 alias still maps to legacy mode",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=v2shell", { UI_SHELL_TARGET: "desktop" }),
    "mobile",
    "v2shell alias still maps to mobile mode",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { USE_NEW_UI_SHELL: "false" }),
    "legacy",
    "legacy boolean env fallback remains supported",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { USE_NEW_UI_SHELL: "true" }),
    "mobile",
    "mobile boolean env fallback remains supported",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { UI_SHELL_TARGET: "invalid", USE_NEW_UI_SHELL: "invalid" }),
    "mobile",
    "invalid env values fall back to mobile default",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html"),
    "mobile",
    "missing env and query falls back to mobile default",
  );
};
