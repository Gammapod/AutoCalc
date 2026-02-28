import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { reduceActionWithV2 } from "../src_v2/compat/legacyReducerAdapter.js";
import { compareParity } from "../src_v2/compat/parityHarness.js";
import { executeCommand } from "../src_v2/domain/commands.js";
import { getCalculatorMode } from "../src_v2/domain/modes.js";

const runSequence = (actions: Action[]): { legacy: GameState; v2: GameState } => {
  let legacy = initialState();
  let v2 = initialState();

  for (const action of actions) {
    legacy = reducer(legacy, action);
    const commandResult = executeCommand(v2, { type: "DispatchAction", action });
    v2 = commandResult.state;
    assert.equal(commandResult.events.length, 1, "every action produces one domain event");
  }

  return { legacy, v2 };
};

export const runV2ParityTests = (): void => {
  const actions: Action[] = [
    { type: "PRESS_KEY", key: "1" },
    { type: "PRESS_KEY", key: "1" },
    { type: "PRESS_KEY", key: "+" },
    { type: "PRESS_KEY", key: "1" },
    { type: "PRESS_KEY", key: "=" },
    { type: "PRESS_KEY", key: "=" },
    { type: "PRESS_KEY", key: "NEG" },
    { type: "PRESS_KEY", key: "CE" },
    { type: "MOVE_KEY_SLOT", fromIndex: 1, toIndex: 0 },
    { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 },
    { type: "UNLOCK_ALL" },
  ];

  const { legacy, v2 } = runSequence(actions);
  const parity = compareParity(legacy, v2);
  assert.equal(parity.ok, true, `v2 state/read-model parity holds (${JSON.stringify(parity.mismatches)})`);

  const reducedViaAdapter = actions.reduce((state, action) => reduceActionWithV2(state, action), initialState());
  const parityAdapter = compareParity(v2, reducedViaAdapter);
  assert.equal(parityAdapter.ok, true, "v2 adapter and command runtime produce identical results");

  assert.equal(getCalculatorMode(initialState()), "idle", "mode idle when no draft/roll");
  assert.equal(
    getCalculatorMode({
      ...initialState(),
      calculator: { ...initialState().calculator, draftingSlot: { operator: "+", operandInput: "", isNegative: false } },
    }),
    "drafting",
    "mode drafting with active drafting slot",
  );
  assert.equal(getCalculatorMode(v2), v2.calculator.roll.length > 0 ? "rolled" : "idle", "rolled mode tracks roll presence");
};
