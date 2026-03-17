import assert from "node:assert/strict";
import { createCueLifecycleCoordinator, runCueLifecycle, type CueLifecycleDeps } from "../src/app/workflows/cueLifecycle.js";
import { resetCueTelemetryForTests, subscribeCueTelemetry, type CueTelemetryEvent } from "../src/app/workflows/cueTelemetry.js";

const createDeps = (): CueLifecycleDeps => ({
  playShellCue: async () => {},
  awaitMotionSettled: async () => {},
  setInputBlocked: () => {},
  redraw: () => {},
  applyStateMutation: () => {},
  setShellFocusView: () => {},
});

export const runUiCueTelemetryTests = async (): Promise<void> => {
  resetCueTelemetryForTests();
  const events: CueTelemetryEvent[] = [];
  const unsubscribe = subscribeCueTelemetry((event) => {
    events.push(event);
  });
  try {
    await runCueLifecycle(
      { kind: "allocator_increase", target: "calculator" },
      createDeps(),
    );
  } finally {
    unsubscribe();
  }

  const phases = events.map((event) => event.phase);
  assert.deepEqual(
    phases,
    ["start", "cue_visible", "state_apply", "settle", "done"],
    "telemetry captures full lifecycle phase order",
  );
  const doneEvent = events.find((event) => event.phase === "done");
  assert.equal(typeof doneEvent?.durationMs === "number", true, "done telemetry includes duration");

  resetCueTelemetryForTests();
  const sequenced: CueTelemetryEvent[] = [];
  const unsubscribeSequenced = subscribeCueTelemetry((event) => {
    sequenced.push(event);
  });
  try {
    const coordinator = createCueLifecycleCoordinator();
    await Promise.all([
      coordinator.run({ kind: "allocator_increase", target: "storage" }, createDeps()),
      coordinator.run({ kind: "unlock_reveal", target: "storage" }, createDeps()),
    ]);
  } finally {
    unsubscribeSequenced();
  }
  assert.equal(sequenced.some((event) => event.phase === "done"), true, "telemetry captures coordinator lifecycle events");
};
