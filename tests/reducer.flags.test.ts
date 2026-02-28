import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";

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
};
