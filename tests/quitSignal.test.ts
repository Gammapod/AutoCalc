import assert from "node:assert/strict";
import { signalQuitApplication } from "../src/app/quitSignal.js";

type MockHost = Pick<Window, "close" | "parent">;

export const runQuitSignalTests = (): void => {
  const calls: string[] = [];
  const host: MockHost = {
    close: () => {
      calls.push("close");
    },
    parent: {
      postMessage: () => {
        calls.push("postMessage");
      },
    } as unknown as Window,
  };

  assert.doesNotThrow(() => {
    signalQuitApplication("unknown", host as Window);
  }, "unsupported shell target should not throw while signaling quit");
  assert.deepEqual(calls, [], "unsupported shell target does not emit quit side effects");

  assert.doesNotThrow(() => {
    signalQuitApplication("mobile_web_itch", host as Window);
  }, "supported shell target emits best-effort quit signal without throwing");
  assert.deepEqual(calls, ["postMessage", "close"], "mobile_web_itch emits postMessage and close");
};

