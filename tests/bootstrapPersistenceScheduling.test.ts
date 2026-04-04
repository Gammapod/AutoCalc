import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runBootstrapPersistenceSchedulingTests = (): void => {
  const bootstrapSource = readFileSync(resolve(process.cwd(), "src/app/bootstrap.ts"), "utf8");
  const coordinatorSource = readFileSync(resolve(process.cwd(), "src/app/modeTransitionCoordinator.ts"), "utf8");

  assert.equal(
    bootstrapSource.includes("createPersistenceSaveScheduler"),
    true,
    "bootstrap wires persistence save scheduler",
  );
  assert.equal(
    bootstrapSource.includes("saveScheduler.schedule(state)"),
    true,
    "bootstrap schedules persistence during normal game render updates",
  );
  assert.equal(
    coordinatorSource.includes("options.saveScheduler.schedule(options.store.getState())"),
    true,
    "mode transition coordinator schedules latest state before explicit save_current transition flush",
  );
  assert.equal(
    coordinatorSource.includes("options.saveScheduler.flushNow()"),
    true,
    "mode transition coordinator flushes pending persistence on explicit save transitions",
  );
  assert.equal(
    coordinatorSource.includes("options.saveScheduler.cancel();")
      && coordinatorSource.includes("options.storageRepo.clear();"),
    true,
    "mode transition coordinator cancels pending persistence before clear_save storage wipe",
  );
};
