import { runEngineTests } from "./engine.test.js";
import { runReducerInputTests } from "./reducer.input.test.js";
import { runReducerLayoutTests } from "./reducer.layout.test.js";
import { runReducerLifecycleTests } from "./reducer.lifecycle.test.js";
import { runReducerUnlockTests } from "./reducer.unlocks.test.js";
import { runPersistenceTests } from "./persistence.test.js";
import { runOperationSlotDisplayTests } from "./operationSlotDisplay.test.js";
import { runRollDisplayTests } from "./rollDisplay.test.js";
import { runTotalDisplayTests } from "./totalDisplay.test.js";
import { runUnlocksDisplayTests } from "./unlocksDisplay.test.js";
import { runUnlockDomainResolverTests } from "./unlockDomainResolver.test.js";
import { runGraphDisplayTests } from "./graphDisplay.test.js";
import { runKeyLabelDisplayTests } from "./keyLabelDisplay.test.js";
import { runKeyVisualGroupTests } from "./keyVisualGroup.test.js";
import { runBrowserImportSafetyTests } from "./browserImportSafety.test.js";
import { runUnlockEngineTests } from "./unlockEngine.test.js";
import { runV2ParityTests } from "./v2Parity.test.js";
import { runV2PersistenceParityTests } from "./v2PersistenceParity.test.js";
import { runStorageDisplayTests } from "./storageDisplay.test.js";
import { runDragDropBehaviorTests } from "./dragDropBehavior.test.js";
import { runReducerFlagsTests } from "./reducer.flags.test.js";
import { runButtonBehaviorTests } from "./buttonBehavior.test.js";
import { runAutoEqualsSchedulerTests } from "./autoEqualsScheduler.test.js";
import { runKeypadLayoutModelTests } from "./keypadLayoutModel.test.js";
import { runNumberDomainAnalysisTests } from "./numberDomainAnalysis.test.js";
import { runPredicateCapabilitySpecTests } from "./predicateCapabilitySpec.test.js";
import { runUnlockGraphTests } from "./unlockGraph.test.js";

const tests: Array<[string, () => void | Promise<void>]> = [
  ["engine", runEngineTests],
  ["reducer/input", runReducerInputTests],
  ["reducer/layout", runReducerLayoutTests],
  ["reducer/lifecycle", runReducerLifecycleTests],
  ["reducer/unlocks", runReducerUnlockTests],
  ["persistence", runPersistenceTests],
  ["ui/operation-slot-display", runOperationSlotDisplayTests],
  ["ui/roll-display", runRollDisplayTests],
  ["ui/graph-display", runGraphDisplayTests],
  ["ui/storage-display", runStorageDisplayTests],
  ["ui/drag-drop-behavior", runDragDropBehaviorTests],
  ["ui/button-behavior", runButtonBehaviorTests],
  ["app/auto-equals-scheduler", runAutoEqualsSchedulerTests],
  ["domain/keypad-layout-model", runKeypadLayoutModelTests],
  ["domain/number-domain-analysis", runNumberDomainAnalysisTests],
  ["domain/predicate-capability-spec", runPredicateCapabilitySpecTests],
  ["domain/unlock-graph", runUnlockGraphTests],
  ["ui/key-label-display", runKeyLabelDisplayTests],
  ["ui/key-visual-group", runKeyVisualGroupTests],
  ["ui/total-display", runTotalDisplayTests],
  ["ui/unlocks-display", runUnlocksDisplayTests],
  ["domain/unlock-engine", runUnlockEngineTests],
  ["v2/parity", runV2ParityTests],
  ["v2/persistence-parity", runV2PersistenceParityTests],
  ["content/unlock-domain-resolver", runUnlockDomainResolverTests],
  ["browser/import-safety", runBrowserImportSafetyTests],
  ["reducer/flags", runReducerFlagsTests],
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
