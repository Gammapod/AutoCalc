import assert from "node:assert/strict";
import { buildActionFixtures, buildDomainEventFixtures, roundTripAction, roundTripEvent } from "./helpers/actionEventRoundTrip.js";
import { eventFromAction } from "../src/domain/events.js";

export const runContractsActionEventRoundTripTests = (): void => {
  const actions = buildActionFixtures();
  for (const action of actions) {
    assert.deepEqual(
      roundTripAction(action),
      action,
      `action round-trip preserves payload for ${action.type}`,
    );
  }

  const events = buildDomainEventFixtures();
  for (const event of events) {
    assert.deepEqual(
      roundTripEvent(event),
      event,
      `event round-trip preserves payload for ${event.type}`,
    );
  }

  assert.equal(
    eventFromAction({ type: "TOGGLE_FLAG", flag: "feature.x" }).type,
    "FlagToggled",
    "TOGGLE_FLAG continues to map through the explicit fallback branch",
  );
  assert.equal(
    eventFromAction({ type: "TOGGLE_VISUALIZER", visualizer: "graph" }).type,
    "VisualizerToggled",
    "TOGGLE_VISUALIZER maps through explicit visualizer branch",
  );
};
