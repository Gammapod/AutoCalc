import assert from "node:assert/strict";
import { resolveAppMode } from "../src/app/appMode.js";

export const runAppModeResolverTests = (): void => {
  assert.equal(
    resolveAppMode("http://localhost/index.html"),
    "sandbox",
    "missing query/env defaults to sandbox mode",
  );
  assert.equal(
    resolveAppMode("http://localhost/index.html?mode=sandbox"),
    "sandbox",
    "mode query enables sandbox mode",
  );
  assert.equal(
    resolveAppMode("http://localhost/index.html?mode=game"),
    "game",
    "mode query can explicitly force game mode",
  );
  assert.equal(
    resolveAppMode("http://localhost/index.html?mode=invalid", { APP_MODE_TARGET: "sandbox" }),
    "sandbox",
    "invalid query falls back to env APP_MODE_TARGET when valid",
  );
  assert.equal(
    resolveAppMode("http://localhost/index.html", { APP_MODE_TARGET: "sandbox" }),
    "sandbox",
    "env APP_MODE_TARGET sandbox is honored when query absent",
  );
};
