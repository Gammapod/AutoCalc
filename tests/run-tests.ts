import "./support/contentProviderSetup.js";
import Algebrite from "algebrite";
import * as keyCompat from "./support/keyCompat.js";
import { runEngineTests } from "./engine.test.js";
import { runReducerInputTests } from "./reducer.input.test.js";
import { runExecutionModePolicyTests } from "./executionModePolicy.test.js";
import { runReducerLayoutTests } from "./reducer.layout.test.js";
import { runReducerLifecycleTests } from "./reducer.lifecycle.test.js";
import { runReducerUnlockTests } from "./reducer.unlocks.test.js";
import { runPersistenceTests } from "./persistence.test.js";
import { runOperationSlotDisplayTests } from "./operationSlotDisplay.test.js";
import { runRollDisplayTests } from "./rollDisplay.test.js";
import { runTotalDisplayTests } from "./totalDisplay.test.js";
import { runGraphDisplayTests } from "./graphDisplay.test.js";
import { runLegacyGraphRenderModelTests } from "./legacyGraphRenderModel.test.js";
import { runKeyLabelDisplayTests } from "./keyLabelDisplay.test.js";
import { runBrowserImportSafetyTests } from "./browserImportSafety.test.js";
import { runUnlockEngineTests } from "./unlockEngine.test.js";
import { runV2ParityTests } from "./v2Parity.test.js";
import { runV2PersistenceParityTests } from "./v2PersistenceParity.test.js";
import { runStorageDisplayTests } from "./storageDisplay.test.js";
import { runDragDropBehaviorTests } from "./dragDropBehavior.test.js";
import { runReducerAllocatorDeviceTests } from "./reducer.allocator-device.test.js";
import { runReducerWrapTailExecutionTests } from "./reducer.wrapTailExecution.test.js";
import { runButtonBehaviorTests } from "./buttonBehavior.test.js";
import { runAnalysisReportTests } from "./analysisReport.test.js";
import { runKeypadLayoutModelTests } from "./keypadLayoutModel.test.js";
import { runNumberDomainAnalysisTests } from "./numberDomainAnalysis.test.js";
import { runCurrentTotalDomainTests } from "./currentTotalDomain.test.js";
import { runRollDerivedTests } from "./rollDerived.test.js";
import { runControlProjectionTests } from "./controlProjection.test.js";
import { runPredicateCapabilitySpecTests } from "./predicateCapabilitySpec.test.js";
import { runUnlockGraphTests } from "./unlockGraph.test.js";
import { runKeyBehaviorContractTests } from "./keyBehavior.contract.test.js";
import { runUiShellSnapAvailabilityTests } from "./uiShell.snapAvailability.test.js";
import { runUiShellGestureArbitrationTests } from "./uiShell.gestureArbitration.test.js";
import { runUiShellRightMenuTests } from "./uiShell.rightMenu.test.js";
import { runUiShellModeResolverTests } from "./uiShell.modeResolver.test.js";
import { runUiShellFallbackControlsTests } from "./uiShell.fallbackControls.test.js";
import { runUiShellDesktopAllocatorRevealTests } from "./uiShell.desktopAllocatorReveal.test.js";
import { runUiShellTouchRearrangeLongPressTests } from "./uiShell.touchRearrange.longPress.test.js";
import { runUiShellTouchRearrangeDropResolutionTests } from "./uiShell.touchRearrange.dropResolution.test.js";
import { runUiShellTouchRearrangeCancelTests } from "./uiShell.touchRearrange.cancel.test.js";
import { runUiShellTouchRearrangeGestureLockTests } from "./uiShell.touchRearrange.gestureLock.test.js";
import { runUiShellTouchRearrangeBottomSnapGateTests } from "./uiShell.touchRearrange.bottomSnapGate.test.js";
import { runUiModuleGrapherV2Tests } from "./uiModule.grapher.v2.test.js";
import { runUiModuleVisualizerHostV2Tests } from "./uiModule.visualizerHost.v2.test.js";
import { runUiModuleCircleVisualizerV2Tests } from "./uiModule.circleVisualizer.v2.test.js";
import { runUiModuleEigenAllocatorRendererV2Tests } from "./uiModule.eigenAllocatorRenderer.v2.test.js";
import { runUiModuleCalculatorStorageV2Tests } from "./uiModule.calculatorStorage.v2.test.js";
import { runUiModuleStorageV2Tests } from "./uiModule.storage.v2.test.js";
import { runUiModuleInputV2Tests } from "./uiModule.input.v2.test.js";
import { runUiModuleAlgebraicRendererV2Tests } from "./uiModule.algebraicRenderer.v2.test.js";
import { runUiModuleFactorizationRendererV2Tests } from "./uiModule.factorizationRenderer.v2.test.js";
import { runUiModuleHelpRendererV2Tests } from "./uiModule.helpRenderer.v2.test.js";
import { runUiModuleReleaseNotesRendererV2Tests } from "./uiModule.releaseNotesRenderer.v2.test.js";
import { runUiLayoutEngineTests } from "./uiLayoutEngine.test.js";
import { runUiMotionCoordinatorTests } from "./uiMotionCoordinator.test.js";
import { runUiCueLifecycleTests } from "./uiCueLifecycle.test.js";
import { runUiMotionLifecycleBridgeTests } from "./uiMotionLifecycleBridge.test.js";
import { runUiLayoutAdapterTests } from "./uiLayoutAdapter.test.js";
import { runUiCueTelemetryTests } from "./uiCueTelemetry.test.js";
import { runUiRuntimeRegistryTests } from "./uiRuntimeRegistry.test.js";
import { runKeyUnlocksTests } from "./keyUnlocks.test.js";
import { runLayoutRulesInvariantTests } from "./layoutRules.invariant.test.js";
import { runLayoutRulesEquivalenceTests } from "./layoutRules.equivalence.test.js";
import { runV2ImportBoundaryTests } from "./v2ImportBoundary.test.js";
import { runContractsParityLongTracesTests } from "./contracts.parityLongTraces.test.js";
import { runContractsParitySeededFuzzTests } from "./contracts.paritySeededFuzz.test.js";
import { runContractsUiActionEmissionTests } from "./contracts.uiActionEmission.test.js";
import { runContractsActionEventRoundTripTests } from "./contracts.actionEventRoundTrip.test.js";
import { runContractsExecutionGateParityTests } from "./contracts.executionGateParity.test.js";
import { runContractsSlotInputParityTests } from "./contracts.slotInputParity.test.js";
import { runContractsSlotInputTargetSpecTests } from "./contracts.slotInputTargetSpec.test.js";
import { runV2RulesAdaptersTests } from "./v2Rules.adapters.test.js";
import { runUiIntegrationMobileShellTests } from "./uiIntegration.mobileShell.test.js";
import { runUiIntegrationDesktopShellTests } from "./uiIntegration.desktopShell.test.js";
import { runButtonRegistryContractTests } from "./buttonRegistry.contract.test.js";
import { runKeyActionHandlersContractTests } from "./keyActionHandlers.contract.test.js";
import { runKeyCatalogNormalizationTests } from "./keyCatalog.normalization.test.js";
import { runKeyIdentityAdaptersTests } from "./keyIdentityAdapters.test.js";
import { runDomainLegacySymbolGuardTests } from "./domainLegacySymbolGuard.test.js";
import { runNoTsNoCheckGuardTests } from "./noTsNoCheckGuard.test.js";
import { runBootstrapBoundaryTests } from "./bootstrapBoundary.test.js";
import { runContentDrillUnlockExtensionTests } from "./contentDrill.unlockExtension.test.js";
import { runUiShellRefsBuilderTests } from "./uiShell.refsBuilder.test.js";
import { runUiShellTransformsTests } from "./uiShell.transforms.test.js";
import { runUiModuleCalculatorMotionTests } from "./uiModule.calculatorMotion.test.js";
import { runUiModuleCalculatorKeypadRenderTests } from "./uiModule.calculatorKeypadRender.test.js";
import { runUiModuleCalculatorRejectBlinkTests } from "./uiModule.calculatorRejectBlink.test.js";
import { runUiModuleCalculatorSlotMarqueeTests } from "./uiModule.calculatorSlotMarquee.test.js";
import { runUiModuleCalculatorSlotDisplayTests } from "./uiModule.calculatorSlotDisplay.test.js";
import { runUiComplexityGateTests } from "./uiComplexityGate.test.js";
import { runUiVisualizerFitContractTests } from "./uiVisualizerFitContract.test.js";
import { runAppModeResolverTests } from "./appMode.resolver.test.js";
import { runAutoStepSchedulerTests } from "./autoStepScheduler.test.js";
import { runEqualsToggleAutoStepTests } from "./equalsToggleAutoStep.test.js";
import { runSandboxPresetTests } from "./sandboxPreset.test.js";
import { runMainMenuPresetTests } from "./mainMenuPreset.test.js";
import { runSystemKeysModeSwitchEffectsTests } from "./systemKeys.modeSwitchEffects.test.js";
import { runSystemKeyIntentRegistryContractTests } from "./systemKeyIntentRegistry.contract.test.js";
import { runQuitSignalTests } from "./quitSignal.test.js";
import { runModeManifestTests } from "./modeManifest.test.js";
import { runCalculatorSeedManifestTests } from "./calculatorSeedManifest.test.js";
import { runContentProviderWiringContractTests } from "./contentProviderWiring.contract.test.js";
import { runCapabilitySemanticsParityContractTests } from "./capabilitySemanticsParity.contract.test.js";
import { runStoragePaletteContractTests } from "./storagePalette.contract.test.js";
import { runShimInventoryTests } from "./shimInventory.test.js";
import { runBootstrapImportOrderTests } from "./bootstrapImportOrder.test.js";
import { runKeyUniverseContractGuardTests } from "./keyUniverseContract.guard.test.js";
import { runContentRegistryBoundaryTests } from "./contentRegistryBoundary.test.js";
import { runMultiCalculatorContractTests } from "./multiCalculator.contract.test.js";
import { runDiagnosticsCatalogCoverageTests } from "./diagnosticsCatalogCoverage.test.js";
import { runDiagnosticsResolverTests } from "./diagnosticsResolver.test.js";
import { runDiagnosticsTraceTests } from "./diagnosticsTrace.test.js";
import { runRollDiagnosticsSnapshotTests } from "./rollDiagnosticsSnapshot.test.js";
import { runRuntimeStateInvariantsPipelineEquivalenceTests } from "./runtimeStateInvariants.pipelineEquivalence.test.js";
import { runReducerPipelineEquivalenceTests } from "./reducer.pipelineEquivalence.test.js";
import { runUnlockHintProgressTests } from "./unlockHintProgress.test.js";

const tests: Array<[string, () => void | Promise<void>]> = [
  ["engine", runEngineTests],
  ["reducer/input", runReducerInputTests],
  ["domain/execution-mode-policy", runExecutionModePolicyTests],
  ["reducer/layout", runReducerLayoutTests],
  ["reducer/allocator-device", runReducerAllocatorDeviceTests],
  ["reducer/lifecycle", runReducerLifecycleTests],
  ["reducer/wrap-tail-execution", runReducerWrapTailExecutionTests],
  ["reducer/unlocks", runReducerUnlockTests],
  ["persistence", runPersistenceTests],
  ["ui/operation-slot-display", runOperationSlotDisplayTests],
  ["ui/roll-display", runRollDisplayTests],
  ["ui/graph-display", runGraphDisplayTests],
  ["ui/legacy-graph-render-model", runLegacyGraphRenderModelTests],
  ["ui/storage-display", runStorageDisplayTests],
  ["ui/drag-drop-behavior", runDragDropBehaviorTests],
  ["ui/button-behavior", runButtonBehaviorTests],
  ["app/analysis-report", runAnalysisReportTests],
  ["domain/keypad-layout-model", runKeypadLayoutModelTests],
  ["domain/number-domain-analysis", runNumberDomainAnalysisTests],
  ["domain/current-total-domain", runCurrentTotalDomainTests],
  ["domain/roll-derived", runRollDerivedTests],
  ["domain/control-projection", runControlProjectionTests],
  ["domain/predicate-capability-spec", runPredicateCapabilitySpecTests],
  ["domain/unlock-graph", runUnlockGraphTests],
  ["domain/key-behavior-contract", runKeyBehaviorContractTests],
  ["domain/key-unlocks", runKeyUnlocksTests],
  ["domain/layout-rules-invariants", runLayoutRulesInvariantTests],
  ["domain/layout-rules-equivalence", runLayoutRulesEquivalenceTests],
  ["ui/key-label-display", runKeyLabelDisplayTests],
  ["ui/total-display", runTotalDisplayTests],
  ["domain/unlock-engine", runUnlockEngineTests],
  ["v2/parity", runV2ParityTests],
  ["v2/persistence-parity", runV2PersistenceParityTests],
  ["browser/import-safety", runBrowserImportSafetyTests],
  ["ui-shell/snap-availability", runUiShellSnapAvailabilityTests],
  ["ui-shell/gesture-arbitration", runUiShellGestureArbitrationTests],
  ["ui-shell/right-menu", runUiShellRightMenuTests],
  ["ui-shell/mode-resolver", runUiShellModeResolverTests],
  ["ui-shell/fallback-controls", runUiShellFallbackControlsTests],
  ["ui-shell/desktop-allocator-reveal", runUiShellDesktopAllocatorRevealTests],
  ["ui-shell/touch-rearrange-long-press", runUiShellTouchRearrangeLongPressTests],
  ["ui-shell/touch-rearrange-drop-resolution", runUiShellTouchRearrangeDropResolutionTests],
  ["ui-shell/touch-rearrange-cancel", runUiShellTouchRearrangeCancelTests],
  ["ui-shell/touch-rearrange-gesture-lock", runUiShellTouchRearrangeGestureLockTests],
  ["ui-shell/touch-rearrange-bottom-snap-gate", runUiShellTouchRearrangeBottomSnapGateTests],
  ["ui-module/calculator-storage-v2", runUiModuleCalculatorStorageV2Tests],
  ["ui-module/storage-v2", runUiModuleStorageV2Tests],
  ["ui-module/input-v2", runUiModuleInputV2Tests],
  ["ui-module/algebraic-renderer-v2", runUiModuleAlgebraicRendererV2Tests],
  ["ui-module/factorization-renderer-v2", runUiModuleFactorizationRendererV2Tests],
  ["ui-module/help-renderer-v2", runUiModuleHelpRendererV2Tests],
  ["ui-module/release-notes-renderer-v2", runUiModuleReleaseNotesRendererV2Tests],
  ["ui-module/grapher-v2", runUiModuleGrapherV2Tests],
  ["ui-module/circle-visualizer-v2", runUiModuleCircleVisualizerV2Tests],
  ["ui-module/eigen-allocator-renderer-v2", runUiModuleEigenAllocatorRendererV2Tests],
  ["ui-module/visualizer-host-v2", runUiModuleVisualizerHostV2Tests],
  ["ui/layout-engine", runUiLayoutEngineTests],
  ["ui/motion-coordinator", runUiMotionCoordinatorTests],
  ["ui/cue-lifecycle", runUiCueLifecycleTests],
  ["ui/motion-lifecycle-bridge", runUiMotionLifecycleBridgeTests],
  ["ui/layout-adapter", runUiLayoutAdapterTests],
  ["ui/cue-telemetry", runUiCueTelemetryTests],
  ["ui/runtime-registry", runUiRuntimeRegistryTests],
  ["ui-integration/mobile-shell", runUiIntegrationMobileShellTests],
  ["ui-integration/desktop-shell", runUiIntegrationDesktopShellTests],
  ["v2/import-boundary", runV2ImportBoundaryTests],
  ["contracts/parity-long-traces", runContractsParityLongTracesTests],
  ["contracts/parity-seeded-fuzz", runContractsParitySeededFuzzTests],
  ["contracts/ui-action-emission", runContractsUiActionEmissionTests],
  ["contracts/action-event-round-trip", runContractsActionEventRoundTripTests],
  ["contracts/execution-gate-parity", runContractsExecutionGateParityTests],
  ["contracts/slot-input-parity", runContractsSlotInputParityTests],
  ["contracts/slot-input-target-spec", runContractsSlotInputTargetSpecTests],
  ["v2/rules-adapters", runV2RulesAdaptersTests],
  ["domain/button-registry-contract", runButtonRegistryContractTests],
  ["domain/key-action-handlers-contract", runKeyActionHandlersContractTests],
  ["domain/key-catalog-normalization", runKeyCatalogNormalizationTests],
  ["domain/key-identity-adapters", runKeyIdentityAdaptersTests],
  ["domain/legacy-symbol-guard", runDomainLegacySymbolGuardTests],
  ["contracts/no-ts-nocheck", runNoTsNoCheckGuardTests],
  ["app/bootstrap-boundary", runBootstrapBoundaryTests],
  ["content-drill/unlock-extension", runContentDrillUnlockExtensionTests],
  ["ui-shell/refs-builder", runUiShellRefsBuilderTests],
  ["ui-shell/transforms", runUiShellTransformsTests],
  ["ui-module/calculator-motion", runUiModuleCalculatorMotionTests],
  ["ui-module/calculator-keypad-render", runUiModuleCalculatorKeypadRenderTests],
  ["ui-module/calculator-reject-blink", runUiModuleCalculatorRejectBlinkTests],
  ["ui-module/calculator-slot-marquee", runUiModuleCalculatorSlotMarqueeTests],
  ["ui-module/calculator-slot-display", runUiModuleCalculatorSlotDisplayTests],
  ["ui/visualizer-fit-contract", runUiVisualizerFitContractTests],
  ["ui/complexity-gate", runUiComplexityGateTests],
  ["app/app-mode-resolver", runAppModeResolverTests],
  ["app/auto-step-scheduler", runAutoStepSchedulerTests],
  ["domain/equals-toggle-auto-step", runEqualsToggleAutoStepTests],
  ["domain/sandbox-preset", runSandboxPresetTests],
  ["domain/main-menu-preset", runMainMenuPresetTests],
  ["domain/system-keys-mode-switch-effects", runSystemKeysModeSwitchEffectsTests],
  ["contracts/system-key-intent-registry", runSystemKeyIntentRegistryContractTests],
  ["app/quit-signal", runQuitSignalTests],
  ["domain/mode-manifest", runModeManifestTests],
  ["domain/calculator-seed-manifest", runCalculatorSeedManifestTests],
  ["contracts/content-provider-wiring", runContentProviderWiringContractTests],
  ["contracts/storage-palette", runStoragePaletteContractTests],
  ["contracts/diagnostics-catalog-coverage", runDiagnosticsCatalogCoverageTests],
  ["contracts/capability-semantics-parity", runCapabilitySemanticsParityContractTests],
  ["contracts/key-universe-guard", runKeyUniverseContractGuardTests],
  ["contracts/shim-inventory", runShimInventoryTests],
  ["contracts/content-registry-boundary", runContentRegistryBoundaryTests],
  ["domain/diagnostics-resolver", runDiagnosticsResolverTests],
  ["domain/diagnostics-trace", runDiagnosticsTraceTests],
  ["domain/roll-diagnostics-snapshot", runRollDiagnosticsSnapshotTests],
  ["domain/unlock-hint-progress", runUnlockHintProgressTests],
  ["domain/runtime-state-invariants-pipeline-equivalence", runRuntimeStateInvariantsPipelineEquivalenceTests],
  ["domain/reducer-pipeline-equivalence", runReducerPipelineEquivalenceTests],
  ["contracts/multi-calculator-invariants", runMultiCalculatorContractTests],
  ["app/bootstrap-import-order", runBootstrapImportOrderTests],
];

const grepArg = process.argv.find((arg) => arg.startsWith("--grep="));
const grepPattern = grepArg ? grepArg.slice("--grep=".length) : "";
const testFilter = grepPattern.length > 0 ? new RegExp(grepPattern) : null;
const testsToRun = testFilter ? tests.filter(([name]) => testFilter.test(name)) : tests;

// Runtime symbolic adapter reads Algebrite from global scope to stay browser-compatible.
(
  globalThis as typeof globalThis & { Algebrite?: unknown }
).Algebrite = Algebrite;

Object.assign(globalThis, keyCompat);

if (testsToRun.length === 0) {
  throw new Error(`No tests matched filter pattern: ${grepPattern}`);
}

let passed = 0;
for (const [name, fn] of testsToRun) {
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

if (passed === testsToRun.length) {
  console.log(`All ${passed} test groups passed.`);
}

