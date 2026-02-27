import { runEngineTests } from "./engine.test.js";
import { runReducerLayoutTests } from "./reducer.layout.test.js";
import { runReducerUnlockTests } from "./reducer.unlocks.test.js";
import { runPersistenceTests } from "./persistence.test.js";
import { runOperationSlotDisplayTests } from "./operationSlotDisplay.test.js";
import { runRollDisplayTests } from "./rollDisplay.test.js";
import { runTotalDisplayTests } from "./totalDisplay.test.js";
import { runUnlocksDisplayTests } from "./unlocksDisplay.test.js";
import { runUnlockDomainResolverTests } from "./unlockDomainResolver.test.js";
import { runRuntimeDependencyMapTests } from "./runtimeDependencyMap.test.js";
import { runGraphDisplayTests } from "./graphDisplay.test.js";
import { runKeyLabelDisplayTests } from "./keyLabelDisplay.test.js";
import { runBrowserImportSafetyTests } from "./browserImportSafety.test.js";

const tests: Array<[string, () => void | Promise<void>]> = [
  ["engine", runEngineTests],
  ["reducer/layout", runReducerLayoutTests],
  ["reducer/unlocks", runReducerUnlockTests],
  ["persistence", runPersistenceTests],
  ["ui/operation-slot-display", runOperationSlotDisplayTests],
  ["ui/roll-display", runRollDisplayTests],
  ["ui/graph-display", runGraphDisplayTests],
  ["ui/key-label-display", runKeyLabelDisplayTests],
  ["ui/total-display", runTotalDisplayTests],
  ["ui/unlocks-display", runUnlocksDisplayTests],
  ["content/unlock-domain-resolver", runUnlockDomainResolverTests],
  ["scripts/runtime-dependency-map", runRuntimeDependencyMapTests],
  ["browser/import-safety", runBrowserImportSafetyTests],
];

let passed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}

if (passed === tests.length) {
  console.log(`All ${passed} test groups passed.`);
}
