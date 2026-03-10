import assert from "node:assert/strict";
import { resolveUiShellMode } from "../src/app/uiShellMode.js";

export const runUiShellModeResolverTests = (): void => {
  assert.equal(
    resolveUiShellMode("http://localhost/index.html?ui=legacy", { UI_SHELL_TARGET: "mobile" }),
    "mobile",
    "legacy query value is deprecated and falls back to mobile",
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
    "mobile",
    "legacy env target is deprecated and falls back to mobile",
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
    resolveUiShellMode("http://localhost/index.html?ui=invalid", { UI_SHELL_TARGET: "desktop" }),
    "desktop",
    "invalid query values are ignored in favor of valid env target",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", { UI_SHELL_TARGET: "invalid" }),
    "mobile",
    "missing/invalid env and query falls back to mobile default",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html"),
    "mobile",
    "missing env and query falls back to mobile default",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", undefined, {
      innerWidth: 1440,
      navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", maxTouchPoints: 0 },
      matchMedia: () => ({ matches: false }),
    }),
    "desktop",
    "desktop-like runtime falls back to desktop shell",
  );
  assert.equal(
    resolveUiShellMode("http://localhost/index.html", undefined, {
      innerWidth: 390,
      navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", maxTouchPoints: 5 },
      matchMedia: () => ({ matches: true }),
    }),
    "mobile",
    "mobile-like runtime falls back to mobile shell",
  );
};
