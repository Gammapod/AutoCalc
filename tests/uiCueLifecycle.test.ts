import assert from "node:assert/strict";
import {
  createCueLifecycleCoordinator,
  runCueLifecycle,
  type CueLifecycleDeps,
  type CuePhase,
} from "../src/app/workflows/cueLifecycle.js";

const createDeps = (events: string[], options: {
  playShellCueDelayMs?: number;
  settleDelayMs?: number;
  settleNever?: boolean;
} = {}): CueLifecycleDeps => ({
  playShellCue: async () => {
    events.push("playShellCue");
    if (options.playShellCueDelayMs && options.playShellCueDelayMs > 0) {
      await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, options.playShellCueDelayMs);
      });
    }
  },
  awaitMotionSettled: async () => {
    events.push("awaitMotionSettled");
    if (options.settleNever) {
      await new Promise<void>(() => {
        // Intentionally unresolved for timeout path.
      });
    }
    if (options.settleDelayMs && options.settleDelayMs > 0) {
      await new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, options.settleDelayMs);
      });
    }
  },
  setInputBlocked: (blocked) => {
    events.push(`input:${blocked ? "on" : "off"}`);
  },
  redraw: () => {
    events.push("redraw");
  },
  applyStateMutation: () => {
    events.push("applyStateMutation");
  },
  setShellFocusView: () => {
    events.push("setShellFocusView");
  },
});

export const runUiCueLifecycleTests = async (): Promise<void> => {
  const phaseEvents: CuePhase[] = [];
  const events: string[] = [];
  await runCueLifecycle(
    { kind: "allocator_increase", target: "calculator" },
    createDeps(events),
    {
      onPhase: (phase) => {
        phaseEvents.push(phase);
      },
    },
  );

  assert.deepEqual(
    phaseEvents,
    ["start", "cue_visible", "state_apply", "settle", "done"],
    "cue lifecycle emits expected phase order",
  );
  assert.equal(
    events.filter((event) => event === "input:on").length,
    1,
    "input block is enabled once per lifecycle",
  );
  assert.equal(
    events.filter((event) => event === "input:off").length,
    1,
    "input block is disabled once per lifecycle",
  );

  const timeoutEvents: string[] = [];
  await runCueLifecycle(
    { kind: "allocator_increase", target: "storage" },
    {
      ...createDeps(timeoutEvents, { settleNever: true }),
      phaseTimeoutMs: {
        settle: 10,
      },
    },
  );
  assert.equal(
    timeoutEvents.includes("input:off"),
    true,
    "timeout fallback still releases input block",
  );

  const coordinator = createCueLifecycleCoordinator();
  const firstPhases: CuePhase[] = [];
  const secondPhases: CuePhase[] = [];
  const thirdPhases: CuePhase[] = [];
  const serializedEvents: string[] = [];

  const first = coordinator.run(
    { kind: "allocator_increase", target: "storage" },
    {
      ...createDeps(serializedEvents, { settleDelayMs: 25 }),
      phaseTimeoutMs: {
        settle: 100,
      },
    },
    {
      onPhase: (phase) => {
        firstPhases.push(phase);
      },
    },
  );

  const second = coordinator.run(
    { kind: "allocator_increase", target: "calculator" },
    {
      ...createDeps(serializedEvents),
      phaseTimeoutMs: {
        settle: 60,
      },
    },
    {
      onPhase: (phase) => {
        secondPhases.push(phase);
      },
    },
  );

  const third = coordinator.run(
    { kind: "unlock_reveal", target: "storage" },
    createDeps(serializedEvents),
    {
      onPhase: (phase) => {
        thirdPhases.push(phase);
      },
    },
  );

  await Promise.all([first, second, third]);

  assert.equal(
    firstPhases.includes("done"),
    true,
    "first cue completes through lifecycle",
  );
  assert.equal(
    secondPhases.includes("done") && thirdPhases.includes("done"),
    true,
    "queued cues complete through lifecycle",
  );
};
