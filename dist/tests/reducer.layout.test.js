import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
export const runReducerLayoutTests = () => {
    const baseline = initialState();
    const baselineLayout = baseline.ui.keyLayout;
    const moved = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 3 });
    assert.equal(moved.ui.keyLayout.length, baselineLayout.length, "move preserves layout length");
    assert.deepEqual(moved.ui.keyLayout.slice(0, 4).map((cell) => (cell.kind === "key" ? cell.key : cell.area)), ["CE", "mul", "div", "C"], "move shifts intermediate entries and reinserts moved entry");
    const swapped = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 });
    assert.deepEqual(swapped.ui.keyLayout.slice(0, 2).map((cell) => (cell.kind === "key" ? cell.key : cell.area)), ["CE", "C"], "swap exchanges the two target slots");
    const invalidMove = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: -1, toIndex: 2 });
    assert.equal(invalidMove, baseline, "invalid move index returns original state reference");
    const invalidSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 2, secondIndex: 99 });
    assert.equal(invalidSwap, baseline, "invalid swap index returns original state reference");
    const noOpSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 4, secondIndex: 4 });
    assert.equal(noOpSwap, baseline, "same-index swap is a no-op");
};
//# sourceMappingURL=reducer.layout.test.js.map