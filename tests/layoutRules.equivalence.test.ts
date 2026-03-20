import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { classifyDropAction as classifyDomainDropAction } from "../src/domain/layoutDragDrop.js";
import { evaluateLayoutDrop } from "../src/domain/layoutRules.js";
import { applyMoveLayoutCell, applySwapLayoutCells } from "../src/domain/reducer.layout.js";
import { initialState } from "../src/domain/state.js";
import { legacyInitialState } from "./support/legacyState.js";
import type { GameState, LayoutSurface } from "../src/domain/types.js";

type DragTarget = { surface: LayoutSurface; index: number };

const createScenarioState = (): GameState => {
  const base = legacyInitialState();
  return {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("1")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        ...utilityUnlockPatch([["C", true], ["UNDO", true]]),
      },
      execution: {
        ...base.unlocks.execution,
        [execution("=")]: true,
      },
    },
    ui: {
      ...base.ui,
      keypadColumns: 3,
      keypadRows: 2,
      keyLayout: [
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: k("1") },
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: k("=") },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
      ],
      storageLayout: [
        { kind: "key", key: k("UNDO") },
        { kind: "key", key: k("=") },
        { kind: "key", key: k("C") },
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
        [k("+")]: false,
      },
    },
    ui: {
      ...state.ui,
      keyLayout: state.ui.keyLayout.map((cell, index) => (index === 1 ? { kind: "key", key: k("+") } : cell)),
    },
  };
  assertClassifierParity(
    lockedKeypadDestination,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 1 },
  );

  const reducerMoveRejected = applyMoveLayoutCell(state, "storage", 0, "keypad", 0);
  assert.equal(reducerMoveRejected, state, "reducer move rejects this storage-to-keypad move under current policy");

  const reducerSwapRejected = applySwapLayoutCells(state, "storage", 0, "keypad", 1);
  assert.equal(reducerSwapRejected, state, "reducer swap rejects this storage-to-keypad swap under current policy");

  const reducerAllowsLockedKeypadDestination = applySwapLayoutCells(
    lockedKeypadDestination,
    "storage",
    0,
    "keypad",
    1,
  );
  assert.equal(
    reducerAllowsLockedKeypadDestination,
    lockedKeypadDestination,
    "reducer rejects locked keypad destinations",
  );

  const reducerPolicyDecision = evaluateLayoutDrop(
    lockedKeypadDestination,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 1 },
    { enforceUnlockedKeypadDestination: false },
  );
  assert.deepEqual(
    reducerPolicyDecision,
    { allowed: false, reason: "locked_key_immobile" },
    "shared evaluator rejects swaps that would move locked keypad keys off-calculator",
  );
};






