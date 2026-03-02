import assert from "node:assert/strict";
import { resolveUiShellMode } from "../src/app/uiShellMode.js";

export const runUiShellModeResolverTests = (): void => {
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=v1", { USE_NEW_UI_SHELL: "true" }),
    "v1",
    "query override forces v1 even when env requests v2",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=v2shell", { USE_NEW_UI_SHELL: "false" }),
    "v2",
    "query override forces v2 even when env requests v1",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { USE_NEW_UI_SHELL: "false" }),
    "v1",
    "env false forces v1 when no query override exists",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { USE_NEW_UI_SHELL: "true" }),
    "v2",
    "env true forces v2 when no query override exists",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { USE_NEW_UI_SHELL: "invalid" }),
    "v2",
    "invalid env values fall back to v2 default",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html"),
    "v2",
    "missing env and query falls back to v2 default",
  );
};
