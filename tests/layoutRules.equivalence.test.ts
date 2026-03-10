import assert from "node:assert/strict";
import { classifyDropAction as classifyDomainDropAction } from "../src/domain/layoutDragDrop.js";
import { evaluateLayoutDrop } from "../src/domain/layoutRules.js";
import { applyMoveLayoutCell, applySwapLayoutCells } from "../src/domain/reducer.layout.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, LayoutSurface } from "../src/domain/types.js";

type DragTarget = { surface: LayoutSurface; index: number };

const createScenarioState = (): GameState => {
  const base = initialState();
  return {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
      utilities: {
        ...base.unlocks.utilities,
        C: true,
        CE: true,
      },
    },
    ui: {
      ...base.ui,
      keypadColumns: 3,
      keypadRows: 2,
      keyLayout: [
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: "1" },
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: "=" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
      ],
      storageLayout: [
        { kind: "key", key: "CE" },
        { kind: "key", key: "=" },
        { kind: "key", key: "\u23EF" },
        ...base.ui.storageLayout.slice(3),
      ],
    },
  };
};

const assertClassifierParity = (state: GameState, source: DragTarget, destination: DragTarget): void => {
  const domainAction = classifyDomainDropAction(state, source, destination);
  const evaluated = evaluateLayoutDrop(state, source, destination);
  const evaluatedAction = evaluated.allowed ? evaluated.action : null;
  assert.equal(
    evaluatedAction,
    domainAction,
    `shared/domain classify parity for ${source.surface}:${source.index} -> ${destination.surface}:${destination.index}`,
  );
};

export const runLayoutRulesEquivalenceTests = (): void => {
  const state = createScenarioState();

  assertClassifierParity(state, { surface: "storage", index: 0 }, { surface: "keypad", index: 0 });
  assertClassifierParity(state, { surface: "storage", index: 0 }, { surface: "keypad", index: 1 });
  assertClassifierParity(state, { surface: "storage", index: 2 }, { surface: "keypad", index: 4 });
  assertClassifierParity(state, { surface: "storage", index: 2 }, { surface: "keypad", index: 3 });
  assertClassifierParity(state, { surface: "storage", index: 0 }, { surface: "storage", index: 99 });

  const lockedKeypadDestination: GameState = {
    ...state,
    unlocks: {
      ...state.unlocks,
      slotOperators: {
        ...state.unlocks.slotOperators,
        "+": false,
      },
    },
    ui: {
      ...state.ui,
      keyLayout: state.ui.keyLayout.map((cell, index) => (index === 1 ? { kind: "key", key: "+" } : cell)),
    },
  };
  assertClassifierParity(
    lockedKeypadDestination,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 1 },
  );

  const reducerMoveRejected = applyMoveLayoutCell(state, "storage", 2, "keypad", 4);
  assert.equal(
    reducerMoveRejected,
    state,
    "reducer move rejects same scenario when shared evaluator rejects step-to-bottom-row move",
  );

  const reducerSwapRejected = applySwapLayoutCells(state, "storage", 2, "keypad", 3);
  assert.equal(
    reducerSwapRejected,
    state,
    "reducer swap rejects same scenario when shared evaluator rejects step-to-bottom-row swap",
  );

  const reducerAllowsLockedKeypadDestination = applySwapLayoutCells(
    lockedKeypadDestination,
    "storage",
    0,
    "keypad",
    1,
  );
  assert.notEqual(
    reducerAllowsLockedKeypadDestination,
    lockedKeypadDestination,
    "reducer keeps legacy behavior by allowing locked keypad destination when using reducer policy",
  );

  const reducerPolicyDecision = evaluateLayoutDrop(
    lockedKeypadDestination,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 1 },
    { enforceUnlockedKeypadDestination: false },
  );
  assert.deepEqual(
    reducerPolicyDecision,
    { allowed: true, action: "swap" },
    "shared evaluator with reducer policy agrees with reducer acceptance",
  );
};
