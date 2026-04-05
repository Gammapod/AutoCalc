import assert from "node:assert/strict";
import {
  awaitMotionSettled,
  beginMotionCycle,
  completeMotionCycle,
  resetMotionLifecycleBridgeForTests,
} from "../src/ui/layout/motionLifecycleBridge.js";

export const runUiMotionLifecycleBridgeTests = async (): Promise<void> => {
  resetMotionLifecycleBridgeForTests();
  const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

  const token = beginMotionCycle("layout-test", 100);
  let resolved = false;
  const waitByToken = awaitMotionSettled(token).then(() => {
    resolved = true;
  });
  completeMotionCycle(token);
  await waitByToken;
  assert.equal(resolved, true, "explicit completion resolves token waiters");

  const firstTokenByChannel = beginMotionCycle("layout-channel", 100);
  const latestTokenByChannel = beginMotionCycle("layout-channel", 100);
  let resolvedByChannel = false;
  const waitByChannel = awaitMotionSettled("layout-channel").then(() => {
    resolvedByChannel = true;
  });
  completeMotionCycle(firstTokenByChannel);
  await sleep(0);
  assert.equal(resolvedByChannel, false, "channel wait tracks latest token, not stale tokens");
  completeMotionCycle(latestTokenByChannel);
  await waitByChannel;
  assert.equal(resolvedByChannel, true, "channel wait resolves when latest token settles");

  const duplicateToken = beginMotionCycle("layout-dup", 100);
  let duplicateResolutions = 0;
  const duplicateWait = awaitMotionSettled(duplicateToken).then(() => {
    duplicateResolutions += 1;
  });
  completeMotionCycle(duplicateToken);
  completeMotionCycle(duplicateToken);
  await duplicateWait;
  await sleep(0);
  assert.equal(duplicateResolutions, 1, "duplicate completion remains idempotent");

  const fallbackToken = beginMotionCycle("layout-fallback", 15);
  const fallbackStartMs = Date.now();
  await awaitMotionSettled(fallbackToken);
  const fallbackElapsedMs = Date.now() - fallbackStartMs;
  assert.equal(fallbackElapsedMs >= 10, true, "fallback timeout does not settle immediately");
  assert.equal(fallbackElapsedMs < 250, true, "fallback timeout settles within bounded time");

  resetMotionLifecycleBridgeForTests();
  const unknownStartMs = Date.now();
  await awaitMotionSettled("layout-none");
  const unknownElapsedMs = Date.now() - unknownStartMs;
  assert.equal(unknownElapsedMs < 20, true, "awaiting unknown channel is immediate no-op");
};

