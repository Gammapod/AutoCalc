import assert from "node:assert/strict";
import { createCueLifecycleCoordinator, runCueLifecycle, type CueLifecycleDeps } from "../src/ui/layout/cueLifecycle.js";
import { resetCueTelemetryForTests, subscribeCueTelemetry, type CueTelemetryEvent } from "../src/ui/layout/cueTelemetry.js";

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
      { kind: "mode_transition", target: "calculator", nextMode: "modify" },
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
  const cancelled: CueTelemetryEvent[] = [];
  const unsubscribeCancelled = subscribeCueTelemetry((event) => {
    cancelled.push(event);
  });
  try {
    const coordinator = createCueLifecycleCoordinator();
    const first = coordinator.run(
      { kind: "allocator_increase", target: "storage" },
      {
        ...createDeps(),
        awaitMotionSettled: async () => {
          await new Promise<void>((resolve) => {
            globalThis.setTimeout(resolve, 30);
          });
        },
      },
    );
    const second = coordinator.run(
      { kind: "mode_transition", target: "calculator", nextMode: "calculator" },
      createDeps(),
    );
    const third = coordinator.run(
      { kind: "unlock_reveal", target: "storage" },
      createDeps(),
    );
    await Promise.all([first, second, third]);
  } finally {
    unsubscribeCancelled();
  }

  assert.equal(
    cancelled.some((event) => event.phase === "cancelled"),
    true,
    "telemetry captures cancellation events",
  );
};
