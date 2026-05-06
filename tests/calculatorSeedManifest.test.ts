import assert from "node:assert/strict";
import { toCoordFromIndex, toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import { calculatorSeedManifest, createSeededKeyLayout } from "../src/domain/calculatorSeedManifest.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";
import { initialState } from "../src/domain/state.js";
import type { CalculatorId } from "../src/domain/types.js";
import { isKeyId } from "../src/domain/keyPresentation.js";

const keySnapshot = (layout: ReturnType<typeof createSeededKeyLayout>["keyLayout"]): Array<string | null> =>
  layout.map((cell) => cell.kind === "key" ? cell.key : null);

export const runCalculatorSeedManifestTests = (): void => {
  const menuA = createSeededKeyLayout("menu");
  const menuB = createSeededKeyLayout("menu");
  assert.deepEqual(menuA, menuB, "menu seeded layout is deterministic");

  const manifestIds = Object.keys(calculatorSeedManifest).sort((a, b) => a.localeCompare(b));
  const profileIds = Object.keys(controlProfiles).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(manifestIds, profileIds, "seed manifest covers every control profile exactly once");

  for (const calculatorId of Object.keys(calculatorSeedManifest) as CalculatorId[]) {
    const seed = createSeededKeyLayout(calculatorId);
    assert.equal(seed.columns, controlProfiles[calculatorId].starts.alpha, `${calculatorId} seed columns derive from alpha`);
    assert.equal(seed.rows, controlProfiles[calculatorId].starts.beta, `${calculatorId} seed rows derive from beta`);

    const occupied = seed.keyLayout.filter((cell) => cell.kind === "key");
    assert.equal(occupied.length, calculatorSeedManifest[calculatorId].placements.length, `${calculatorId} applies each authored placement once`);

    const placementIndexes = new Set<number>();
    for (const placement of calculatorSeedManifest[calculatorId].placements) {
      assert.equal(isKeyId(placement.key), true, `${calculatorId} seed placement key is canonical: ${placement.key}`);
      const index = toIndexFromCoord({ row: placement.row, col: placement.col }, seed.columns, seed.rows);
      assert.equal(index >= 0 && index < seed.keyLayout.length, true, `${calculatorId} seed placement is inside keypad bounds`);
      assert.equal(placementIndexes.has(index), false, `${calculatorId} seed does not place two keys in the same cell`);
      placementIndexes.add(index);

      const cell = seed.keyLayout[index];
      assert.equal(cell.kind, "key", `${calculatorId} seed placement materializes a key cell`);
      assert.equal(cell.kind === "key" ? cell.key : null, placement.key, `${calculatorId} seed placement key is applied`);
      if (placement.behavior) {
        assert.deepEqual(cell.kind === "key" ? cell.behavior : undefined, placement.behavior, `${calculatorId} seed placement behavior is applied`);
      }
    }

    seed.keyLayout.forEach((cell, index) => {
      if (cell.kind === "placeholder") {
        assert.equal(cell.area, "empty", `${calculatorId} unplaced cell is an empty placeholder`);
        return;
      }
      const coord = toCoordFromIndex(index, seed.columns, seed.rows);
      const placement = calculatorSeedManifest[calculatorId].placements.find((candidate) =>
        candidate.row === coord.row && candidate.col === coord.col);
      assert.ok(placement, `${calculatorId} materialized key has an authored placement`);
    });
  }

  const fSeed = createSeededKeyLayout("f");
  const fBase = initialState();
  assert.equal(fBase.ui.keypadColumns, fSeed.columns, "initial f columns derive from seeded layout");
  assert.equal(fBase.ui.keypadRows, fSeed.rows, "initial f rows derive from seeded layout");
  assert.deepEqual(keySnapshot(fBase.ui.keyLayout), keySnapshot(fSeed.keyLayout), "initial state uses the f seed layout");
};
