import assert from "node:assert/strict";
import {
  awaitMotionSettled,
  beginMotionCycle,
  completeMotionCycle,
  resetMotionLifecycleBridgeForTests,
} from "../src/ui/layout/motionLifecycleBridge.js";

export const runUiMotionLifecycleBridgeTests = async (): Promise<void> => {
  resetMotionLifecycleBridgeForTests();

  const token = beginMotionCycle("layout-test", 100);
  let resolved = false;
  const waitByToken = awaitMotionSettled(token).then(() => {
    resolved = true;
  });
  completeMotionCycle(token);
  await waitByToken;
  assert.equal(resolved, true, "explicit completion resolves token waiters");

  const tokenByChannel = beginMotionCycle("layout-channel", 100);
  const waitByChannel = awaitMotionSettled("layout-channel");
  completeMotionCycle(tokenByChannel);
  await waitByChannel;
  assert.ok(true, "channel wait resolves latest token");

  const duplicateToken = beginMotionCycle("layout-dup", 100);
  completeMotionCycle(duplicateToken);
  completeMotionCycle(duplicateToken);
  await awaitMotionSettled(duplicateToken);
  assert.ok(true, "duplicate completion is idempotent");

  const fallbackToken = beginMotionCycle("layout-fallback", 5);
  await awaitMotionSettled(fallbackToken);
  assert.ok(true, "fallback timeout settles unresolved cycle");

  resetMotionLifecycleBridgeForTests();
  await awaitMotionSettled("layout-none");
  assert.ok(true, "awaiting an unknown channel is a no-op");
};

