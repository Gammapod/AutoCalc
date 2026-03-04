import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG, initialState } from "../src/domain/state.js";

export const runReducerFlagsTests = (): void => {
  const base = initialState();

  const toggledOn = reducer(base, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(toggledOn.ui.buttonFlags["sticky.negate"], true, "TOGGLE_FLAG sets an unset flag");

  const toggledOff = reducer(toggledOn, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(Boolean(toggledOff.ui.buttonFlags["sticky.negate"]), false, "TOGGLE_FLAG clears a set flag");
  assert.equal(
    Object.prototype.hasOwnProperty.call(toggledOff.ui.buttonFlags, "sticky.negate"),
    false,
    "cleared flags are removed from the map",
  );

  const blankNoop = reducer(base, { type: "TOGGLE_FLAG", flag: "   " });
  assert.equal(blankNoop, base, "blank flag names are ignored");

  const graphOn = reducer(base, { type: "TOGGLE_FLAG", flag: GRAPH_VISIBLE_FLAG });
  assert.equal(graphOn.ui.buttonFlags[GRAPH_VISIBLE_FLAG], true, "GRAPH toggles on");

  const feedOn = reducer(graphOn, { type: "TOGGLE_FLAG", flag: FEED_VISIBLE_FLAG });
  assert.equal(feedOn.ui.buttonFlags[FEED_VISIBLE_FLAG], true, "FEED toggles on");
  assert.equal(
    Boolean(feedOn.ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    false,
    "turning FEED on clears GRAPH",
  );

  const feedOff = reducer(feedOn, { type: "TOGGLE_FLAG", flag: FEED_VISIBLE_FLAG });
  assert.equal(Boolean(feedOff.ui.buttonFlags[FEED_VISIBLE_FLAG]), false, "FEED toggles off when active");
};
