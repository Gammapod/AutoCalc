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
import { runReducerAllocatorDeviceTests } from "./reducer.allocator-device.test.js";
import { runButtonBehaviorTests } from "./buttonBehavior.test.js";
import { runAutoEqualsSchedulerTests } from "./autoEqualsScheduler.test.js";
import { runAnalysisReportTests } from "./analysisReport.test.js";
import { runKeypadLayoutModelTests } from "./keypadLayoutModel.test.js";
import { runNumberDomainAnalysisTests } from "./numberDomainAnalysis.test.js";
import { runPredicateCapabilitySpecTests } from "./predicateCapabilitySpec.test.js";
import { runUnlockGraphTests } from "./unlockGraph.test.js";
import { runKeyBehaviorContractTests } from "./keyBehavior.contract.test.js";
import { runUiShellSnapAvailabilityTests } from "./uiShell.snapAvailability.test.js";
import { runUiShellSnapSelectionTests } from "./uiShell.snapSelection.test.js";
import { runUiShellGestureArbitrationTests } from "./uiShell.gestureArbitration.test.js";
import { runUiShellRightMenuTests } from "./uiShell.rightMenu.test.js";
import { runUiShellModeResolverTests } from "./uiShell.modeResolver.test.js";
import { runUiShellFallbackControlsTests } from "./uiShell.fallbackControls.test.js";
import { runUiShellTouchRearrangeLongPressTests } from "./uiShell.touchRearrange.longPress.test.js";
import { runUiShellTouchRearrangeDropResolutionTests } from "./uiShell.touchRearrange.dropResolution.test.js";
import { runUiShellTouchRearrangeCancelTests } from "./uiShell.touchRearrange.cancel.test.js";
import { runUiShellTouchRearrangeGestureLockTests } from "./uiShell.touchRearrange.gestureLock.test.js";
import { runUiShellTouchRearrangeBottomSnapGateTests } from "./uiShell.touchRearrange.bottomSnapGate.test.js";
import { runUiModuleChecklistV2Tests } from "./uiModule.checklist.v2.test.js";
import { runUiModuleAllocatorV2Tests } from "./uiModule.allocator.v2.test.js";
import { runUiModuleGrapherV2Tests } from "./uiModule.grapher.v2.test.js";
import { runUiModuleVisualizerHostV2Tests } from "./uiModule.visualizerHost.v2.test.js";
import { runKeyUnlocksTests } from "./keyUnlocks.test.js";
import { runLayoutRulesInvariantTests } from "./layoutRules.invariant.test.js";
import { runLayoutRulesEquivalenceTests } from "./layoutRules.equivalence.test.js";

const tests: Array<[string, () => void | Promise<void>]> = [
  ["engine", runEngineTests],
  ["reducer/input", runReducerInputTests],
  ["reducer/layout", runReducerLayoutTests],
  ["reducer/allocator-device", runReducerAllocatorDeviceTests],
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
  ["app/analysis-report", runAnalysisReportTests],
  ["domain/keypad-layout-model", runKeypadLayoutModelTests],
  ["domain/number-domain-analysis", runNumberDomainAnalysisTests],
  ["domain/predicate-capability-spec", runPredicateCapabilitySpecTests],
  ["domain/unlock-graph", runUnlockGraphTests],
  ["domain/key-behavior-contract", runKeyBehaviorContractTests],
  ["domain/key-unlocks", runKeyUnlocksTests],
  ["domain/layout-rules-invariants", runLayoutRulesInvariantTests],
  ["domain/layout-rules-equivalence", runLayoutRulesEquivalenceTests],
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
  ["ui-shell/snap-availability", runUiShellSnapAvailabilityTests],
  ["ui-shell/snap-selection", runUiShellSnapSelectionTests],
  ["ui-shell/gesture-arbitration", runUiShellGestureArbitrationTests],
  ["ui-shell/right-menu", runUiShellRightMenuTests],
  ["ui-shell/mode-resolver", runUiShellModeResolverTests],
  ["ui-shell/fallback-controls", runUiShellFallbackControlsTests],
  ["ui-shell/touch-rearrange-long-press", runUiShellTouchRearrangeLongPressTests],
  ["ui-shell/touch-rearrange-drop-resolution", runUiShellTouchRearrangeDropResolutionTests],
  ["ui-shell/touch-rearrange-cancel", runUiShellTouchRearrangeCancelTests],
  ["ui-shell/touch-rearrange-gesture-lock", runUiShellTouchRearrangeGestureLockTests],
  ["ui-shell/touch-rearrange-bottom-snap-gate", runUiShellTouchRearrangeBottomSnapGateTests],
  ["ui-module/checklist-v2", runUiModuleChecklistV2Tests],
  ["ui-module/allocator-v2", runUiModuleAllocatorV2Tests],
  ["ui-module/grapher-v2", runUiModuleGrapherV2Tests],
  ["ui-module/visualizer-host-v2", runUiModuleVisualizerHostV2Tests],
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
