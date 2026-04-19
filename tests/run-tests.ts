import "./support/contentProviderSetup.js";
import { runPersistenceTests } from "./persistence.test.js";
import { runV2PersistenceParityTests } from "./v2PersistenceParity.test.js";
import { runKeyCatalogNormalizationTests } from "./keyCatalog.normalization.test.js";
import { runCatalogCanonicalGuardTests } from "./catalogCanonical.guard.test.js";
import { runContractsActionEventCurrentTests } from "./contracts.actionEvent.current.test.js";
import { runContractsDomainUiEffectsCurrentTests } from "./contracts.domainUiEffects.current.test.js";
import { runNoLegacySymbolsGuardTests } from "./noLegacySymbols.guard.test.js";
import { runBootstrapDebugControlBindingsTests } from "./bootstrapDebugControlBindings.test.js";
import { runReducerScalarLimitPolicyTests } from "./reducer.scalarLimitPolicy.test.js";
import { runUiVisualizerUxSpecInvariantsTests } from "./uiVisualizerUxSpecInvariants.test.js";
import { runUiModuleRatiosRendererV2Tests } from "./uiModule.ratiosRenderer.v2.test.js";
import { runKeyCapabilityProgressionTests } from "./keyCapabilityProgression.test.js";
import { runOperatorTestingMatrixContractTests } from "./operatorTestingMatrix.contract.test.js";
import { runDisplayPolicySevenSegmentTests } from "./displayPolicy.sevenSegment.test.js";
import { runUiGraphHintProjectionTests } from "./uiGraphHintProjection.test.js";

const tests: Array<[string, () => void | Promise<void>]> = [
  ["persistence", runPersistenceTests],
  ["v2/persistence-parity", runV2PersistenceParityTests],
  ["domain/key-catalog-normalization", runKeyCatalogNormalizationTests],
  ["contracts/catalog-canonical-guard", runCatalogCanonicalGuardTests],
  ["contracts/action-event-current", runContractsActionEventCurrentTests],
  ["contracts/domain-ui-effects-current", runContractsDomainUiEffectsCurrentTests],
  ["contracts/no-legacy-symbols-guard", runNoLegacySymbolsGuardTests],
  ["ui/bootstrap-debug-control-bindings", runBootstrapDebugControlBindingsTests],
  ["reducer/scalar-limit-policy", runReducerScalarLimitPolicyTests],
  ["ui/module-ratios-renderer-v2", runUiModuleRatiosRendererV2Tests],
  ["ui/visualizer-ux-spec-invariants", runUiVisualizerUxSpecInvariantsTests],
  ["domain/key-capability-progression", runKeyCapabilityProgressionTests],
  ["contracts/operator-testing-matrix", runOperatorTestingMatrixContractTests],
  ["ui/display-policy-seven-segment", runDisplayPolicySevenSegmentTests],
  ["ui/graph-hint-projection", runUiGraphHintProjectionTests],
];

const grepArg = process.argv.find((arg) => arg.startsWith("--grep="));
const grepPattern = grepArg ? grepArg.slice("--grep=".length) : "";
const testFilter = grepPattern.length > 0 ? new RegExp(grepPattern) : null;
const testsToRun = testFilter ? tests.filter(([name]) => testFilter.test(name)) : tests;

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
