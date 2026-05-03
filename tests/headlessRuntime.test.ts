import assert from "node:assert/strict";
import { createHeadlessRuntime } from "../src/app/headlessRuntime.js";
import {
  createHeadlessJsonlSession,
  parseHeadlessInteractiveCommand,
  serializeHeadlessJson,
} from "../src/app/headlessSession.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { reducer } from "../src/domain/reducer.js";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
import type { UiEffect } from "../src/domain/types.js";

export const runHeadlessRuntimeTests = (): void => {
  runHeadlessRuntimeDispatchTests();
  runHeadlessJsonlParserTests();
  runHeadlessJsonlSessionTests();
  runHeadlessReducerBoundaryTests();
};

const runHeadlessRuntimeDispatchTests = (): void => {
  const runtime = createHeadlessRuntime({ mode: "game", persistGameState: false });
  try {
    assert.equal(runtime.getMode(), "game", "headless runtime starts in requested app mode");
    assert.equal(runtime.getReadModel().totalDisplay, "0", "headless runtime exposes initial read model");

    const lockedDigitResult = runtime.press(KEY_ID.digit_1);
    assert.equal(lockedDigitResult.readModel.totalDisplay, "0", "fresh locked digit_1 press does not change total");
    assert.equal(
      lockedDigitResult.uiEffects.some((effect) =>
        effect.type === "input_feedback" && effect.outcome === "rejected" && effect.reasonCode === "locked"),
      true,
      "fresh locked digit_1 press is rejected as locked",
    );
    assert.equal(
      lockedDigitResult.state.ui.diagnostics.lastAction.sequence,
      0,
      "fresh locked digit_1 press does not advance diagnostics",
    );

    const unlockResult = runtime.dispatch({ type: "UNLOCK_ALL" });
    assert.ok(unlockResult.state.completedUnlockIds.length > 0, "headless dispatch runs through real reducer unlock handling");

    runtime.press(KEY_ID.digit_1);
    runtime.dispatch({ type: "INSTALL_KEY_FROM_STORAGE", key: KEY_ID.op_add, toSurface: "keypad", toIndex: 2 });
    const draftResult = runtime.press(KEY_ID.op_add);

    assert.equal(draftResult.readModel.totalDisplay, "1", "headless key presses project active calculator behavior");
    assert.equal(draftResult.readModel.slotView, "slots:0+draft", "headless read model reflects active calculator draft state");
    assert.ok(
      draftResult.uiEffects.some((effect) => effect.type === "roll_updated"),
      "headless dispatch exposes runtime UI effects",
    );

    const undoResult = runtime.press(KEY_ID.util_undo);
    assert.equal(undoResult.readModel.slotView, "slots:0+draft", "undo preserves current function draft after popping roll");
  } finally {
    runtime.dispose();
  }
};

const runHeadlessJsonlParserTests = (): void => {
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"press","key":"digit_1"}'),
    { cmd: "press", key: "digit_1" },
    "parser accepts press command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"command":"help"}'),
    { cmd: "help" },
    "parser accepts command alias when cmd is absent",
  );
  assert.throws(
    () => parseHeadlessInteractiveCommand('{"cmd":"help","command":"snapshot"}'),
    /invalid_command:cmd and command fields must match/,
    "parser rejects conflicting cmd and command fields",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"snapshot","includeState":true,"calculatorId":"f_prime"}'),
    { cmd: "snapshot", includeState: true, calculatorId: "f_prime" },
    "parser accepts scoped snapshot includeState command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"layout","surface":"storage","filter":"op_add","includeEmpty":true}'),
    { cmd: "layout", surface: "storage", filter: "op_add", includeEmpty: true },
    "parser accepts compact layout command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"unlockAll","verbose":true}'),
    { cmd: "unlockAll", verbose: true },
    "parser accepts verbose unlockAll command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"drop","source":{"surface":"storage","index":14},"destination":{"surface":"keypad","index":2}}'),
    { cmd: "drop", source: { surface: "storage", index: 14 }, destination: { surface: "keypad", index: 2 } },
    "parser accepts drop command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"install","key":"op_div","destination":{"surface":"keypad","index":2},"calculatorId":"f_prime"}'),
    { cmd: "install", key: "op_div", destination: { surface: "keypad", index: 2 }, calculatorId: "f_prime" },
    "parser accepts direct install command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"listCalculators"}'),
    { cmd: "listCalculators" },
    "parser accepts calculator discovery command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"setActiveCalculator","calculatorId":"g_prime"}'),
    { cmd: "setActiveCalculator", calculatorId: "g_prime" },
    "parser accepts active calculator switch command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"hints"}'),
    { cmd: "hints" },
    "parser accepts hints command",
  );
  assert.deepEqual(
    parseHeadlessInteractiveCommand('{"cmd":"run","maxTicks":25,"stopWhenIdle":false}'),
    { cmd: "run", maxTicks: 25, stopWhenIdle: false },
    "parser accepts deterministic run command",
  );
  assert.throws(
    () => parseHeadlessInteractiveCommand("{"),
    /invalid_json:/,
    "parser reports invalid JSON",
  );
  assert.throws(
    () => parseHeadlessInteractiveCommand('{"cmd":"bogus"}'),
    /unknown_command:Unknown command: bogus/,
    "parser reports unknown commands",
  );
};

const assertOkResponseShape = (response: ReturnType<ReturnType<typeof createHeadlessJsonlSession>["handleLine"]>): void => {
  assert.equal(response.ok, true, "expected JSONL command response to succeed");
  if (!response.ok) {
    return;
  }
  assert.ok("feedback" in response, "ok response includes feedback channel");
  assert.ok(Array.isArray(response.feedback.uiEffects), "feedback includes uiEffects array");
  assert.ok("snapshot" in response, "ok response includes compact snapshot");
  assert.ok("readModel" in response.snapshot, "snapshot includes read model");
  assert.ok(Array.isArray(response.changes), "ok response includes changes array");
};

const runHeadlessJsonlSessionTests = (): void => {
  const session = createHeadlessJsonlSession({ mode: "game" });
  try {
    const ready = session.ready();
    assert.equal(ready.event, "session_ready", "session emits ready event");
    assert.ok(ready.supportedCommands.includes("press"), "ready event lists supported commands");
    assert.ok(ready.supportedCommands.includes("layout"), "ready event lists layout command");
    assert.ok(ready.supportedCommands.includes("hints"), "ready event lists hints command");
    assert.ok(ready.supportedCommands.includes("install"), "ready event lists direct install command");
    assert.deepEqual(
      ready.snapshot.inputLimits,
      { seedDigitCount: 1, operandDigitCount: 1 },
      "ready snapshot exposes single-digit input limits",
    );
    assert.equal(ready.snapshot.settings.visualizer, "total", "ready snapshot exposes public settings");

    const listResponse = session.handleLine('{"cmd":"listKeys","filter":"digit"}');
    assertOkResponseShape(listResponse);
    assert.equal(listResponse.ok && Array.isArray((listResponse.result as { keys?: unknown[] }).keys), true, "listKeys returns key list");
    assert.equal(
      listResponse.ok
        && (listResponse.result as { keys: Array<{ key: string }> }).keys.some((entry) => entry.key === KEY_ID.digit_1),
      false,
      "listKeys defaults to currently usable keys",
    );

    const allKeysResponse = session.handleLine('{"cmd":"listKeys","filter":"digit_1","all":true}');
    assertOkResponseShape(allKeysResponse);
    const allDigitOne = allKeysResponse.ok
      ? (allKeysResponse.result as { keys: Array<{ key: string; label: string; category: string; arity: number | null; inputFamily: string; behaviorKind: string; traits: string[]; maturity: string; usable: boolean; capability: string; location: string; positions: Array<{ surface: string; index: number }>; installedOnKeypad: boolean; pressable: boolean; installable: boolean; pressBlockReason?: string }> }).keys[0]
      : null;
    assert.equal(allDigitOne?.key, KEY_ID.digit_1, "listKeys all:true includes locked digit_1");
    assert.equal(allDigitOne?.category, "value_expression", "listKeys reports catalog category");
    assert.equal(allDigitOne?.arity, 0, "listKeys reports digit arity");
    assert.equal(allDigitOne?.inputFamily, "atom_digit", "listKeys reports input family");
    assert.equal(allDigitOne?.behaviorKind, "digit", "listKeys reports behavior kind");
    assert.equal(allDigitOne?.maturity, "fully_implemented", "sandbox-installed keys report fully implemented maturity");
    assert.deepEqual(
      {
        usable: allDigitOne?.usable,
        capability: allDigitOne?.capability,
        location: allDigitOne?.location,
        positions: allDigitOne?.positions,
        installedOnKeypad: allDigitOne?.installedOnKeypad,
        pressable: allDigitOne?.pressable,
        installable: allDigitOne?.installable,
        pressBlockReason: allDigitOne?.pressBlockReason,
      },
      {
        usable: false,
        capability: "locked",
        location: "keypad",
        positions: [{ surface: "keypad", index: 1 }],
        installedOnKeypad: true,
        pressable: false,
        installable: false,
        pressBlockReason: "locked",
      },
      "listKeys all:true includes locked keys with capability, location, and pressability metadata",
    );

    const historyKeysResponse = session.handleLine('{"cmd":"listKeys","filter":"toggle_history","all":true}');
    assertOkResponseShape(historyKeysResponse);
    const historyKey = historyKeysResponse.ok
      ? (historyKeysResponse.result as { keys: Array<{ key: string; label: string; maturity: string; installable: boolean; usable: boolean; capability: string; location: string; positions: Array<{ surface: string; index: number }>; installedOnKeypad: boolean; pressable: boolean; pressBlockReason?: string }> }).keys[0]
      : null;
    assert.deepEqual(
      {
        key: historyKey?.key,
        label: historyKey?.label,
        maturity: historyKey?.maturity,
        usable: historyKey?.usable,
        capability: historyKey?.capability,
        location: historyKey?.location,
        positions: historyKey?.positions,
        installedOnKeypad: historyKey?.installedOnKeypad,
        pressable: historyKey?.pressable,
        installable: historyKey?.installable,
        pressBlockReason: historyKey?.pressBlockReason,
      },
      {
        key: KEY_ID.toggle_history,
        label: "History",
        maturity: "fully_implemented",
        usable: true,
        capability: "portable",
        location: "storage",
        positions: [{ surface: "storage", index: 8 }],
        installedOnKeypad: false,
        pressable: false,
        installable: true,
        pressBlockReason: "not_installed",
      },
      "listKeys differentiates unlocked storage keys from pressable keypad keys",
    );

    const experimentalKeyResponse = session.handleLine('{"cmd":"listKeys","filter":"unary_sigma","all":true}');
    assertOkResponseShape(experimentalKeyResponse);
    const experimentalKey = experimentalKeyResponse.ok
      ? (experimentalKeyResponse.result as { keys: Array<{ key: string; maturity: string; arity: number | null }> }).keys[0]
      : null;
    assert.equal(experimentalKey?.key, KEY_ID.unary_sigma, "listKeys includes representative sandbox storage-only key");
    assert.equal(experimentalKey?.arity, 1, "listKeys derives unary operator arity");
    assert.equal(experimentalKey?.maturity, "experimental", "sandbox storage-only keys report experimental maturity");

    const deferredKeyResponse = session.handleLine('{"cmd":"listKeys","filter":"system_new_game","all":true}');
    assertOkResponseShape(deferredKeyResponse);
    const deferredKey = deferredKeyResponse.ok
      ? (deferredKeyResponse.result as { keys: Array<{ key: string; arity: number | null; maturity: string; installable: boolean }> }).keys[0]
      : null;
    assert.equal(deferredKey?.key, KEY_ID.system_new_game, "listKeys includes representative deferred key");
    assert.equal(deferredKey?.arity, 0, "listKeys derives command key arity");
    assert.equal(deferredKey?.maturity, "deferred", "non-sandbox-installed/non-storage keys report deferred maturity");
    assert.equal(deferredKey?.installable, false, "locked deferred key is not installable before unlock");

    const unavailableKeyResponse = session.handleLine('{"cmd":"listKeys","filter":"const_pi","all":true}');
    assertOkResponseShape(unavailableKeyResponse);
    const unavailableKey = unavailableKeyResponse.ok
      ? (unavailableKeyResponse.result as { keys: Array<{ key: string; maturity: string; installable: boolean }> }).keys[0]
      : null;
    assert.equal(unavailableKey?.maturity, "unavailable", "unavailable constants are surfaced as unavailable");
    assert.equal(unavailableKey?.installable, false, "unavailable constants are not installable");

    const lockedInstallResponse = session.handleLine('{"cmd":"install","key":"op_div","destination":{"surface":"keypad","index":2}}');
    assertOkResponseShape(lockedInstallResponse);
    assert.equal(lockedInstallResponse.ok && lockedInstallResponse.accepted, false, "direct install rejects locked portable-family keys");
    assert.equal(lockedInstallResponse.ok && lockedInstallResponse.reasonCode, "not_portable", "locked direct install reports not_portable");

    const lockedPressResponse = session.handleLine('{"cmd":"press","key":"digit_1"}');
    assertOkResponseShape(lockedPressResponse);
    assert.equal(
      lockedPressResponse.ok
        && lockedPressResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "rejected" && effect.reasonCode === "locked"),
      true,
      "locked keypad key press reports locked reason",
    );
    assert.equal(lockedPressResponse.ok && lockedPressResponse.accepted, false, "locked keypad key press is not accepted");
    assert.equal(lockedPressResponse.ok && lockedPressResponse.reasonCode, "locked", "locked keypad key press reports top-level reason");

    const notInstalledPressResponse = session.handleLine('{"cmd":"press","key":"toggle_history"}');
    assertOkResponseShape(notInstalledPressResponse);
    assert.equal(
      notInstalledPressResponse.ok
        && notInstalledPressResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "rejected" && effect.reasonCode === "not_installed"),
      true,
      "unlocked storage-only key press reports not-installed reason",
    );
    assert.equal(notInstalledPressResponse.ok && notInstalledPressResponse.accepted, false, "storage-only press is not accepted");
    assert.equal(notInstalledPressResponse.ok && notInstalledPressResponse.reasonCode, "not_installed", "storage-only press reports top-level reason");

    const invalidKeyResponse = session.handleLine('{"cmd":"press","key":"digit_11"}');
    assert.equal(invalidKeyResponse.ok, false, "invalid key returns JSON error");
    assert.equal(invalidKeyResponse.ok ? "" : invalidKeyResponse.error.code, "invalid_key", "invalid key error is classified");

    const invalidCalculatorResponse = session.handleLine('{"cmd":"press","key":"digit_1","calculatorId":"not_real"}');
    assert.equal(invalidCalculatorResponse.ok, false, "invalid calculator returns JSON error");
    assert.equal(
      invalidCalculatorResponse.ok ? "" : invalidCalculatorResponse.error.code,
      "invalid_calculator",
      "invalid calculator error is classified",
    );

    const unlockResponse = session.handleLine('{"cmd":"unlockAll"}');
    assertOkResponseShape(unlockResponse);
    assert.deepEqual(
      unlockResponse.ok && unlockResponse.result,
      { message: "all keys unlocked", unlockedCount: 23, layoutChanged: true },
      "unlockAll returns compact debug result by default",
    );
    assert.equal(
      unlockResponse.ok
        && unlockResponse.snapshot.completedUnlockIds.length === 0
        && unlockResponse.snapshot.readModel.unlockRows.length === 0
        && unlockResponse.changes.length === 0,
      true,
      "compact unlockAll response redacts unlock details while suppressing bulky diffs",
    );

    const layoutResponse = session.handleLine('{"cmd":"layout","surface":"storage","filter":"op_add"}');
    assertOkResponseShape(layoutResponse);
    assert.deepEqual(
      layoutResponse.ok
        && (layoutResponse.result as {
          layout: {
            surfaces: Array<{
              surface: string;
              cells: Array<{ index: number; key: string; label: string; surface: string; pressable: boolean }>;
            }>;
          };
        }).layout.surfaces[0].cells[0],
      {
        index: 14,
        kind: "key",
        key: KEY_ID.op_add,
        label: "+",
        surface: "storage",
        usable: true,
        capability: "portable",
        pressable: false,
        pressBlockReason: "not_installed",
      },
      "layout returns drop-ready storage indexes without requiring full state",
    );

    const emptyLayoutResponse = session.handleLine('{"cmd":"layout","surface":"keypad","includeEmpty":true}');
    assertOkResponseShape(emptyLayoutResponse);
    assert.equal(
      emptyLayoutResponse.ok
        && (emptyLayoutResponse.result as { layout: { surfaces: Array<{ cells: Array<{ kind: string }> }> } }).layout.surfaces[0].cells.some((cell) => cell.kind === "empty"),
      true,
      "layout can include empty keypad destinations for drop planning",
    );

    const verboseUnlockSession = createHeadlessJsonlSession({ mode: "game" });
    try {
      verboseUnlockSession.ready();
      const verboseUnlockResponse = verboseUnlockSession.handleLine('{"cmd":"unlockAll","verbose":true}');
      assertOkResponseShape(verboseUnlockResponse);
      assert.equal(
        verboseUnlockResponse.ok
          && verboseUnlockResponse.snapshot.completedUnlockIds.length > 0
          && verboseUnlockResponse.changes.some((change) => change.path === "completedUnlockIds"),
        true,
        "verbose unlockAll keeps unlock details and diffs",
      );
    } finally {
      verboseUnlockSession.dispose();
    }

    const installGraphResponse = session.handleLine('{"cmd":"drop","source":{"surface":"storage","index":65},"destination":{"surface":"keypad","index":2}}');
    assertOkResponseShape(installGraphResponse);
    assert.equal(
      installGraphResponse.ok
        && (installGraphResponse.result as { action?: unknown }).action === "install"
        && installGraphResponse.accepted === true
        && installGraphResponse.reasonCode === undefined
        && installGraphResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "accepted"),
      true,
      "drop installs storage keys onto the keypad",
    );

    const visualizerResponse = session.handleLine('{"cmd":"press","key":"viz_feed"}');
    assertOkResponseShape(visualizerResponse);
    assert.equal(
      visualizerResponse.ok
        && visualizerResponse.feedback.uiEffects.some((effect) => effect.type === "settings_changed"),
      true,
      "headless press uses UI key semantics for visualizer keys",
    );
    assert.equal(visualizerResponse.ok && visualizerResponse.snapshot.state, undefined, "compact visualizer press omits full state");
    assert.equal(
      visualizerResponse.ok && visualizerResponse.snapshot.settings.visualizer,
      "feed",
      "visualizer key press updates compact snapshot settings",
    );
    const visualizerSnapshotResponse = session.handleLine('{"cmd":"snapshot","includeState":true}');
    assertOkResponseShape(visualizerSnapshotResponse);
    assert.equal(
      visualizerSnapshotResponse.ok && visualizerSnapshotResponse.snapshot.state?.settings.visualizer,
      "feed",
      "visualizer key press changes active visualizer",
    );

    const invalidDropResponse = session.handleLine('{"cmd":"drop","source":{"surface":"keypad","index":2},"destination":{"surface":"keypad","index":2}}');
    assertOkResponseShape(invalidDropResponse);
    assert.equal(
      invalidDropResponse.ok
        && invalidDropResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "rejected" && effect.reasonCode === "layout_invalid_or_noop"),
      true,
      "invalid drop returns layout_invalid_or_noop feedback",
    );
    assert.equal(invalidDropResponse.ok && invalidDropResponse.accepted, false, "invalid drop is not accepted");
    assert.equal(invalidDropResponse.ok && invalidDropResponse.reasonCode, "layout_invalid_or_noop", "invalid drop reports top-level reason");

    const pressResponse = session.handleLine('{"cmd":"press","key":"digit_1"}');
    assertOkResponseShape(pressResponse);
    assert.ok(
      pressResponse.ok && pressResponse.changes.some((change) => change.path === "readModel.totalDisplay"),
      "press response reports compact snapshot changes",
    );
    assert.equal(pressResponse.ok && pressResponse.accepted, true, "accepted press reports top-level acceptance");
    assert.equal(pressResponse.ok && pressResponse.reasonCode, undefined, "accepted press omits top-level reason");

    const installAddResponse = session.handleLine('{"cmd":"drop","source":{"surface":"storage","index":14},"destination":{"surface":"keypad","index":3}}');
    assertOkResponseShape(installAddResponse);
    assert.equal(installAddResponse.ok && (installAddResponse.result as { action?: unknown }).action, "install", "drop can install operator keys");
    assert.equal(installAddResponse.ok && installAddResponse.accepted, true, "accepted operator install reports top-level acceptance");

    const installDigitTwoResponse = session.handleLine('{"cmd":"drop","source":{"surface":"storage","index":2},"destination":{"surface":"keypad","index":4}}');
    assertOkResponseShape(installDigitTwoResponse);
    assert.equal(installDigitTwoResponse.ok && (installDigitTwoResponse.result as { action?: unknown }).action, "install", "drop can install value keys");

    const swapResponse = session.handleLine('{"cmd":"drop","source":{"surface":"keypad","index":3},"destination":{"surface":"keypad","index":4}}');
    assertOkResponseShape(swapResponse);
    assert.equal(swapResponse.ok && (swapResponse.result as { action?: unknown }).action, "swap", "drop can swap keypad keys");

    const swapBackResponse = session.handleLine('{"cmd":"drop","source":{"surface":"keypad","index":3},"destination":{"surface":"keypad","index":4}}');
    assertOkResponseShape(swapBackResponse);
    assert.equal(swapBackResponse.ok && (swapBackResponse.result as { action?: unknown }).action, "swap", "drop can swap keypad keys back");

    const uninstallResponse = session.handleLine('{"cmd":"drop","source":{"surface":"keypad","index":2},"destination":null}');
    assertOkResponseShape(uninstallResponse);
    assert.equal(uninstallResponse.ok && (uninstallResponse.result as { action?: unknown }).action, "uninstall", "drop can uninstall keypad keys");

    const addPressResponse = session.handleLine('{"cmd":"press","key":"op_add"}');
    assertOkResponseShape(addPressResponse);
    assert.equal(
      addPressResponse.ok
        && addPressResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "accepted"),
      true,
      "installed operator key can be pressed",
    );

    const digitTwoPressResponse = session.handleLine('{"cmd":"press","key":"digit_2"}');
    assertOkResponseShape(digitTwoPressResponse);
    assert.equal(
      digitTwoPressResponse.ok
        && digitTwoPressResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "accepted"),
      true,
      "installed value key can be pressed",
    );

    const equalsResponse = session.handleLine('{"cmd":"press","key":"exec_equals"}');
    assertOkResponseShape(equalsResponse);
    assert.equal(equalsResponse.ok && equalsResponse.snapshot.executionActive, true, "equals press exposes execution-active state");
    const runResponse = session.handleLine('{"cmd":"run","maxTicks":10}');
    assertOkResponseShape(runResponse);
    assert.deepEqual(
      runResponse.ok && runResponse.result,
      { ticks: 1, stoppedReason: "inactive" },
      "run advances execution deterministically until inactive",
    );

    const snapshotResponse = session.handleLine('{"cmd":"snapshot","includeState":true}');
    assertOkResponseShape(snapshotResponse);
    assert.equal(snapshotResponse.ok && Boolean(snapshotResponse.snapshot.state), true, "snapshot can include full state on request");

    const exitResponse = session.handleLine('{"cmd":"exit"}');
    assertOkResponseShape(exitResponse);
    assert.equal(session.isClosed(), true, "exit closes session");

    const serialized = serializeHeadlessJson(pressResponse);
    assert.doesNotThrow(() => JSON.parse(serialized), "interactive responses serialize as JSON");
  } finally {
    session.dispose();
  }

  const sandboxSession = createHeadlessJsonlSession({ mode: "sandbox" });
  try {
    const ready = sandboxSession.ready();
    assert.equal(ready.snapshot.activeCalculatorId, "f_prime", "sandbox starts on f_prime");

    const calculatorsResponse = sandboxSession.handleLine('{"cmd":"listCalculators"}');
    assertOkResponseShape(calculatorsResponse);
    const calculators = calculatorsResponse.ok
      ? (calculatorsResponse.result as { calculators: Array<{ id: string; symbol: string; active: boolean; dimensions: { columns: number; rows: number }; total: string; rollCount: number; visualizer: string }> }).calculators
      : [];
    assert.equal(calculators.length, 4, "listCalculators includes sandbox calculators");
    assert.deepEqual(
      calculators.find((calculator) => calculator.id === "f_prime"),
      {
        id: "f_prime",
        symbol: "f_prime",
        active: true,
        dimensions: { columns: 6, rows: 5 },
        total: "0",
        rollCount: 0,
        visualizer: "total",
      },
      "listCalculators reports active calculator metadata",
    );

    const installResponse = sandboxSession.handleLine('{"cmd":"install","key":"op_div","destination":{"surface":"keypad","index":0},"calculatorId":"f_prime"}');
    assertOkResponseShape(installResponse);
    assert.equal(installResponse.ok && installResponse.accepted, true, "direct install succeeds for portable key");
    assert.equal(
      installResponse.ok
        && installResponse.feedback.uiEffects.some((effect) =>
          effect.type === "input_feedback" && effect.outcome === "accepted"),
      true,
      "direct install emits accepted feedback",
    );

    const duplicateInstallResponse = sandboxSession.handleLine('{"cmd":"install","key":"op_add","destination":{"surface":"keypad","index":0},"calculatorId":"f_prime"}');
    assertOkResponseShape(duplicateInstallResponse);
    assert.equal(duplicateInstallResponse.ok && duplicateInstallResponse.accepted, false, "direct install rejects duplicate keypad key");
    assert.equal(duplicateInstallResponse.ok && duplicateInstallResponse.reasonCode, "duplicate_installed", "duplicate install reports reason");

    const unavailableInstallResponse = sandboxSession.handleLine('{"cmd":"install","key":"const_pi","destination":{"surface":"keypad","index":0},"calculatorId":"f_prime"}');
    assertOkResponseShape(unavailableInstallResponse);
    assert.equal(unavailableInstallResponse.ok && unavailableInstallResponse.reasonCode, "key_unavailable", "direct install rejects unavailable constants");

    const invalidDestinationInstallResponse = sandboxSession.handleLine('{"cmd":"install","key":"op_div","destination":{"surface":"storage","index":0},"calculatorId":"f_prime"}');
    assertOkResponseShape(invalidDestinationInstallResponse);
    assert.equal(invalidDestinationInstallResponse.ok && invalidDestinationInstallResponse.reasonCode, "destination_invalid", "direct install rejects non-keypad destinations");

    const scopedSnapshotBeforeSwitch = sandboxSession.handleLine('{"cmd":"snapshot","calculatorId":"i_prime"}');
    assertOkResponseShape(scopedSnapshotBeforeSwitch);
    assert.equal(scopedSnapshotBeforeSwitch.ok && scopedSnapshotBeforeSwitch.snapshot.projectedCalculatorId, "i_prime", "scoped snapshot marks projected calculator");
    assert.equal(scopedSnapshotBeforeSwitch.ok && scopedSnapshotBeforeSwitch.snapshot.activeCalculatorId, "f_prime", "scoped snapshot does not switch active calculator");

    const switchResponse = sandboxSession.handleLine('{"cmd":"setActiveCalculator","calculatorId":"g_prime"}');
    assertOkResponseShape(switchResponse);
    assert.equal(switchResponse.ok && switchResponse.snapshot.activeCalculatorId, "g_prime", "setActiveCalculator switches active calculator");

    const scopedSnapshotAfterSwitch = sandboxSession.handleLine('{"cmd":"snapshot","calculatorId":"i_prime"}');
    assertOkResponseShape(scopedSnapshotAfterSwitch);
    assert.equal(scopedSnapshotAfterSwitch.ok && scopedSnapshotAfterSwitch.snapshot.activeCalculatorId, "g_prime", "scoped snapshot preserves active calculator after switch");
    assert.equal(scopedSnapshotAfterSwitch.ok && scopedSnapshotAfterSwitch.snapshot.projectedCalculatorId, "i_prime", "scoped snapshot can inspect a non-active calculator");

    const historyToggleResponse = sandboxSession.handleLine('{"cmd":"press","key":"toggle_binary_octave_cycle"}');
    assertOkResponseShape(historyToggleResponse);
    assert.equal(historyToggleResponse.ok && historyToggleResponse.snapshot.state, undefined, "compact toggle press omits full state");
    assert.equal(
      historyToggleResponse.ok && historyToggleResponse.snapshot.settings.wrapper,
      "binary_octave_cycle",
      "toggle key press updates compact snapshot settings",
    );

    const seedFirstDigit = sandboxSession.handleLine('{"cmd":"press","key":"digit_1"}');
    assertOkResponseShape(seedFirstDigit);
    const seedReplacementResponse = sandboxSession.handleLine('{"cmd":"press","key":"digit_2"}');
    assertOkResponseShape(seedReplacementResponse);
    assert.deepEqual(
      seedReplacementResponse.ok
        && seedReplacementResponse.feedback.uiEffects.find((effect): effect is Extract<UiEffect, { type: "input_feedback" }> =>
          effect.type === "input_feedback")?.replacement,
      { target: "seed", previous: "1", next: "2", limit: 1 },
      "seed digit replacement feedback includes replacement metadata",
    );

    sandboxSession.handleLine('{"cmd":"press","key":"op_mul"}');
    sandboxSession.handleLine('{"cmd":"press","key":"digit_4"}');
    const operandReplacementResponse = sandboxSession.handleLine('{"cmd":"press","key":"digit_8"}');
    assertOkResponseShape(operandReplacementResponse);
    assert.deepEqual(
      operandReplacementResponse.ok
        && operandReplacementResponse.feedback.uiEffects.find((effect): effect is Extract<UiEffect, { type: "input_feedback" }> =>
          effect.type === "input_feedback")?.replacement,
      { target: "operand", previous: "4", next: "8", limit: 1 },
      "operand digit replacement feedback includes replacement metadata",
    );
  } finally {
    sandboxSession.dispose();
  }

  const hintSession = createHeadlessJsonlSession({ mode: "game" });
  try {
    hintSession.ready();
    const unlockCompletedIdsFor = (response: ReturnType<typeof hintSession.handleLine>): string[] =>
      response.ok
        ? response.feedback.uiEffects
            .filter((effect): effect is Extract<UiEffect, { type: "unlock_completed" }> => effect.type === "unlock_completed")
            .map((effect) => effect.unlockId)
        : [];
    const freshHintsResponse = hintSession.handleLine('{"cmd":"hints"}');
    assertOkResponseShape(freshHintsResponse);
    const freshHints = freshHintsResponse.ok
      ? (freshHintsResponse.result as { hints: Array<{ unlockId: string; description: string; effectType: string; targetLabel: string; progress: unknown }> }).hints
      : [];
    assert.ok(freshHints.length > 0, "hints returns fresh-game eligible rows");
    assert.ok(
      freshHints.every((hint) => typeof hint.description === "string" && typeof hint.effectType === "string" && typeof hint.targetLabel === "string"),
      "hints joins catalog description and effect metadata",
    );

    hintSession.handleLine('{"cmd":"press","key":"unary_inc"}');
    hintSession.handleLine('{"cmd":"press","key":"exec_equals"}');
    const unlockRunResponse = hintSession.handleLine('{"cmd":"run","maxTicks":5}');
    assertOkResponseShape(unlockRunResponse);
    const unlockCompletedEffects = unlockRunResponse.ok
      ? unlockRunResponse.feedback.uiEffects.filter((effect) => effect.type === "unlock_completed")
      : [];
    assert.deepEqual(
      unlockCompletedIdsFor(unlockRunResponse),
      ["unlock_digit_1_installed_only_on_total_equals_1"],
      "installed-only digit_1 unlock emits unlock-completed effect",
    );
    assert.equal(
      unlockCompletedEffects.every((effect) =>
        effect.type === "unlock_completed"
        && typeof effect.unlockId === "string"
        && typeof effect.description === "string"
        && typeof effect.targetLabel === "string"
        && typeof effect.effectType === "string"),
      true,
      "unlock completion effects include human-readable summary data",
    );
    const secondRunResponse = hintSession.handleLine('{"cmd":"run","maxTicks":5}');
    assertOkResponseShape(secondRunResponse);
    assert.equal(
      secondRunResponse.ok && secondRunResponse.feedback.uiEffects.some((effect) => effect.type === "unlock_completed"),
      false,
      "already-completed unlocks do not re-emit completion effects",
    );
    let portableUnlockResponse = secondRunResponse;
    for (let index = 0; index < 8; index += 1) {
      hintSession.handleLine('{"cmd":"press","key":"exec_equals"}');
      portableUnlockResponse = hintSession.handleLine('{"cmd":"run","maxTicks":5}');
      assertOkResponseShape(portableUnlockResponse);
    }
    assert.equal(
      portableUnlockResponse.ok && portableUnlockResponse.snapshot.readModel.totalDisplay,
      "9",
      "staged digit_1 regression reaches total 9",
    );
    assert.deepEqual(
      unlockCompletedIdsFor(portableUnlockResponse),
      ["unlock_digit_1_portable_on_total_equals_9"],
      "portable digit_1 upgrade emits a distinct unlock-completed effect",
    );
    hintSession.handleLine('{"cmd":"press","key":"exec_equals"}');
    const postPortableRepeatResponse = hintSession.handleLine('{"cmd":"run","maxTicks":5}');
    assertOkResponseShape(postPortableRepeatResponse);
    assert.deepEqual(
      unlockCompletedIdsFor(postPortableRepeatResponse).filter((unlockId) =>
        unlockId === "unlock_digit_1_installed_only_on_total_equals_1"
        || unlockId === "unlock_digit_1_portable_on_total_equals_9"),
      [],
      "already-completed staged digit_1 unlock ids do not re-emit",
    );
    const laterHintsResponse = hintSession.handleLine('{"cmd":"hints"}');
    assertOkResponseShape(laterHintsResponse);
    const laterHints = laterHintsResponse.ok
      ? (laterHintsResponse.result as { hints: Array<{ unlockId: string }> }).hints
      : [];
    assert.notDeepEqual(
      laterHints.map((hint) => hint.unlockId),
      freshHints.map((hint) => hint.unlockId),
      "hints change after progression",
    );
  } finally {
    hintSession.dispose();
  }
};

const runHeadlessReducerBoundaryTests = (): void => {
  const sandbox = createSandboxState();
  const invalidTarget = reducer(sandbox, {
    type: "PRESS_KEY",
    key: KEY_ID.digit_1,
    calculatorId: "not_real",
  } as unknown as Parameters<typeof reducer>[1]);
  const invalidCalculators = invalidTarget.calculators as Record<string, unknown> | undefined;
  assert.equal(Boolean(invalidCalculators?.not_real), false, "invalid calculatorId does not create calculator records");
  assert.equal(Boolean(invalidTarget.calculators?.menu), false, "invalid calculatorId does not materialize menu");

  const validTarget = reducer(sandbox, { type: "PRESS_KEY", key: KEY_ID.digit_1, calculatorId: "g_prime" });
  assert.equal(
    validTarget.calculators?.g_prime?.calculator.total.kind === "rational"
      && validTarget.calculators.g_prime.calculator.total.value.num === 1n,
    true,
    "valid sandbox targeted calculator input still applies",
  );
};
