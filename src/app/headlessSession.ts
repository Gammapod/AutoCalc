import { createInterface } from "node:readline";
import { createHeadlessRuntime, type HeadlessSnapshot } from "./headlessRuntime.js";
import { DEBUG_UNLOCK_BYPASS_FLAG } from "../domain/state.js";
import { keyPresentationCatalog, isKeyId } from "../domain/keyPresentation.js";
import { isKeyInstalledOnActiveKeypad, resolveKeyCapability } from "../domain/keyUnlocks.js";
import { isCalculatorId, projectCalculatorToLegacy, resolveActiveCalculatorId } from "../domain/multiCalculator.js";
import { getKeyLayoutForSurface } from "../domain/calculatorSurface.js";
import { classifyDropAction } from "../domain/layoutDragDrop.js";
import { buildLayoutDropDispatchAction } from "../ui/modules/input/dragDrop.js";
import type { AppMode } from "../contracts/appMode.js";
import type { Action, CalculatorId, GameState, Key, KeyCapability, KeyInput, LayoutSurface, UiEffect } from "../domain/types.js";

type JsonRecord = Record<string, unknown>;
type HeadlessLayoutTarget = { surface: LayoutSurface; index: number };

export type HeadlessInteractiveCommand =
  | { cmd: "help" }
  | { cmd: "listKeys"; filter?: string; all?: boolean; calculatorId?: CalculatorId }
  | { cmd: "layout"; surface?: LayoutSurface; filter?: string; includeEmpty?: boolean; calculatorId?: CalculatorId }
  | { cmd: "press"; key: string; calculatorId?: CalculatorId }
  | { cmd: "action"; action: Action }
  | { cmd: "unlockAll"; verbose?: boolean }
  | { cmd: "drop"; source: HeadlessLayoutTarget; destination: HeadlessLayoutTarget | null }
  | { cmd: "run"; maxTicks?: number; stopWhenIdle?: boolean }
  | { cmd: "snapshot"; includeState?: boolean }
  | { cmd: "tick"; calculatorId?: CalculatorId }
  | { cmd: "exit" };

export type HeadlessCompactSnapshot = {
  mode: AppMode;
  activeCalculatorId?: CalculatorId;
  readModel: HeadlessSnapshot["readModel"];
  diagnostics: HeadlessSnapshot["diagnostics"];
  completedUnlockIds: string[];
  executionActive: boolean;
  executionFlags: string[];
  state?: HeadlessSnapshot["state"];
};

export type HeadlessSnapshotChange = {
  path: string;
  before: unknown;
  after: unknown;
};

type HeadlessFeedback = {
  uiEffects: UiEffect[];
  quitRequested: boolean;
};

type HeadlessActionOutcome = {
  accepted: boolean;
  reasonCode?: Extract<Extract<UiEffect, { type: "input_feedback" }>["reasonCode"], string>;
};

type HeadlessOkResponse = {
  ok: true;
  sequence: number;
  command: HeadlessInteractiveCommand;
  feedback: HeadlessFeedback;
  snapshot: HeadlessCompactSnapshot;
  changes: HeadlessSnapshotChange[];
  accepted?: boolean;
  reasonCode?: HeadlessActionOutcome["reasonCode"];
  result?: unknown;
};

type HeadlessErrorResponse = {
  ok: false;
  sequence: number;
  error: {
    code: string;
    message: string;
  };
};

export type HeadlessInteractiveResponse = HeadlessOkResponse | HeadlessErrorResponse;

export type HeadlessSessionReadyResponse = {
  ok: true;
  sequence: 0;
  event: "session_ready";
  mode: AppMode;
  supportedCommands: string[];
  snapshot: HeadlessCompactSnapshot;
};

export type HeadlessJsonlSessionOptions = {
  mode?: AppMode;
};

const SUPPORTED_COMMANDS = ["help", "listKeys", "layout", "press", "action", "unlockAll", "drop", "run", "snapshot", "tick", "exit"] as const;

const HELP_RESULT = {
  commands: [
    { cmd: "help", description: "Return supported command examples." },
    { cmd: "listKeys", description: "List usable keys with capability, location, surface indexes, and pressability. Optional filter matches id or label; all:true includes locked catalog keys." },
    { cmd: "layout", description: "Return compact indexed storage/keypad cells for planning drop commands. Optional surface, filter, includeEmpty, and calculatorId." },
    { cmd: "press", description: "Press an installed keypad key by id, optionally with calculatorId." },
    { cmd: "action", description: "Dispatch a raw runtime action." },
    { cmd: "unlockAll", description: "Unlock all runtime capabilities. verbose:true keeps full unlock diffs." },
    { cmd: "drop", description: "Mirror frontend drag/drop with source and destination layout targets." },
    { cmd: "run", description: "Synchronously dispatch AUTO_STEP_TICK until inactive, idle, or maxTicks." },
    { cmd: "snapshot", description: "Return the current compact snapshot. Optional includeState includes full state." },
    { cmd: "tick", description: "Dispatch one AUTO_STEP_TICK for execution toggles such as =." },
    { cmd: "exit", description: "End the interactive session." },
  ],
  examples: [
    { cmd: "unlockAll" },
    { cmd: "listKeys", filter: "digit" },
    { cmd: "listKeys", all: true, filter: "viz" },
    { cmd: "layout", surface: "storage", filter: "op_add" },
    { cmd: "layout", surface: "keypad", includeEmpty: true },
    { cmd: "press", key: "digit_1" },
    { cmd: "press", key: "op_add", calculatorId: "f" },
    { cmd: "drop", source: { surface: "storage", index: 14 }, destination: { surface: "keypad", index: 2 } },
    { cmd: "run", maxTicks: 100, stopWhenIdle: true },
    { cmd: "tick" },
    { cmd: "snapshot", includeState: true },
  ],
  notes: [
    "Use cmd as the command field. command is accepted as a compatibility alias when cmd is absent.",
    "listKeys usable means unlocked; pressable means headless press will dispatch because the key is installed on the keypad.",
    "Use layout or listKeys positions to find storage/keypad indexes before issuing drop.",
    "For press and drop, ok means the JSON command was handled; accepted reports whether the user action changed domain state.",
    "Undo removes roll rows but preserves the current function draft; use backspace or C to clear builder input.",
  ],
};

const VALID_LAYOUT_SURFACES = new Set<LayoutSurface>([
  "keypad",
  "keypad_f",
  "keypad_g",
  "keypad_menu",
  "keypad_f_prime",
  "keypad_g_prime",
  "keypad_h_prime",
  "keypad_i_prime",
  "storage",
]);

const toJsonCompatible = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_key, entry) => (typeof entry === "bigint" ? entry.toString() : entry)));

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertNever = (value: never): never => {
  throw new Error(`Unhandled command: ${JSON.stringify(value)}`);
};

const parseLayoutTarget = (value: unknown, field: string): HeadlessLayoutTarget => {
  if (!isRecord(value)) {
    throw new Error(`invalid_command:${field} must be an object with surface and index.`);
  }
  if (typeof value.surface !== "string" || !VALID_LAYOUT_SURFACES.has(value.surface as LayoutSurface)) {
    throw new Error(`invalid_command:${field}.surface must be a valid layout surface.`);
  }
  if (!Number.isInteger(value.index) || (value.index as number) < 0) {
    throw new Error(`invalid_command:${field}.index must be a non-negative integer.`);
  }
  return { surface: value.surface as LayoutSurface, index: value.index as number };
};

export const parseHeadlessInteractiveCommand = (line: string): HeadlessInteractiveCommand => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    throw new Error(`invalid_json:${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) {
    throw new Error("invalid_command:Command must be a JSON object.");
  }
  if (parsed.cmd !== undefined && typeof parsed.cmd !== "string") {
    throw new Error("invalid_command:cmd must be a string when provided.");
  }
  if (parsed.command !== undefined && typeof parsed.command !== "string") {
    throw new Error("invalid_command:command must be a string when provided.");
  }
  if (typeof parsed.cmd === "string" && typeof parsed.command === "string" && parsed.cmd !== parsed.command) {
    throw new Error("invalid_command:cmd and command fields must match when both are provided.");
  }
  const cmd = parsed.cmd ?? parsed.command;
  if (typeof cmd !== "string") {
    throw new Error("invalid_command:Command must include string field cmd.");
  }

  if (cmd === "help") {
    return { cmd: "help" };
  }
  if (cmd === "listKeys") {
    if (parsed.filter !== undefined && typeof parsed.filter !== "string") {
      throw new Error("invalid_command:listKeys filter must be a string.");
    }
    if (parsed.all !== undefined && typeof parsed.all !== "boolean") {
      throw new Error("invalid_command:listKeys all must be a boolean.");
    }
    if (parsed.calculatorId !== undefined && typeof parsed.calculatorId !== "string") {
      throw new Error("invalid_command:listKeys calculatorId must be a string.");
    }
    return {
      cmd: "listKeys",
      ...(parsed.filter ? { filter: parsed.filter } : {}),
      ...(parsed.all === true ? { all: true } : {}),
      ...(parsed.calculatorId ? { calculatorId: parsed.calculatorId as CalculatorId } : {}),
    };
  }
  if (cmd === "layout") {
    if (parsed.surface !== undefined && (typeof parsed.surface !== "string" || !VALID_LAYOUT_SURFACES.has(parsed.surface as LayoutSurface))) {
      throw new Error("invalid_command:layout surface must be a valid layout surface.");
    }
    if (parsed.filter !== undefined && typeof parsed.filter !== "string") {
      throw new Error("invalid_command:layout filter must be a string.");
    }
    if (parsed.includeEmpty !== undefined && typeof parsed.includeEmpty !== "boolean") {
      throw new Error("invalid_command:layout includeEmpty must be a boolean.");
    }
    if (parsed.calculatorId !== undefined && typeof parsed.calculatorId !== "string") {
      throw new Error("invalid_command:layout calculatorId must be a string.");
    }
    return {
      cmd: "layout",
      ...(parsed.surface ? { surface: parsed.surface as LayoutSurface } : {}),
      ...(parsed.filter ? { filter: parsed.filter } : {}),
      ...(parsed.includeEmpty === true ? { includeEmpty: true } : {}),
      ...(parsed.calculatorId ? { calculatorId: parsed.calculatorId as CalculatorId } : {}),
    };
  }
  if (cmd === "press") {
    if (typeof parsed.key !== "string") {
      throw new Error("invalid_command:press requires string field key.");
    }
    if (parsed.calculatorId !== undefined && typeof parsed.calculatorId !== "string") {
      throw new Error("invalid_command:press calculatorId must be a string.");
    }
    return {
      cmd: "press",
      key: parsed.key,
      ...(parsed.calculatorId ? { calculatorId: parsed.calculatorId as CalculatorId } : {}),
    };
  }
  if (cmd === "action") {
    if (!isRecord(parsed.action) || typeof parsed.action.type !== "string") {
      throw new Error("invalid_command:action requires an action object with string field type.");
    }
    return { cmd: "action", action: parsed.action as Action };
  }
  if (cmd === "unlockAll") {
    if (parsed.verbose !== undefined && typeof parsed.verbose !== "boolean") {
      throw new Error("invalid_command:unlockAll verbose must be a boolean.");
    }
    return { cmd: "unlockAll", ...(parsed.verbose ? { verbose: true } : {}) };
  }
  if (cmd === "drop") {
    const source = parseLayoutTarget(parsed.source, "drop source");
    const destination = parsed.destination === null
      ? null
      : parseLayoutTarget(parsed.destination, "drop destination");
    return { cmd: "drop", source, destination };
  }
  if (cmd === "run") {
    if (parsed.maxTicks !== undefined && (!Number.isInteger(parsed.maxTicks) || (parsed.maxTicks as number) < 0)) {
      throw new Error("invalid_command:run maxTicks must be a non-negative integer.");
    }
    if (parsed.stopWhenIdle !== undefined && typeof parsed.stopWhenIdle !== "boolean") {
      throw new Error("invalid_command:run stopWhenIdle must be a boolean.");
    }
    return {
      cmd: "run",
      ...(parsed.maxTicks !== undefined ? { maxTicks: parsed.maxTicks as number } : {}),
      ...(parsed.stopWhenIdle !== undefined ? { stopWhenIdle: parsed.stopWhenIdle as boolean } : {}),
    };
  }
  if (cmd === "snapshot") {
    if (parsed.includeState !== undefined && typeof parsed.includeState !== "boolean") {
      throw new Error("invalid_command:snapshot includeState must be a boolean.");
    }
    return { cmd: "snapshot", ...(parsed.includeState ? { includeState: true } : {}) };
  }
  if (cmd === "tick") {
    if (parsed.calculatorId !== undefined && typeof parsed.calculatorId !== "string") {
      throw new Error("invalid_command:tick calculatorId must be a string.");
    }
    return { cmd: "tick", ...(parsed.calculatorId ? { calculatorId: parsed.calculatorId as CalculatorId } : {}) };
  }
  if (cmd === "exit") {
    return { cmd: "exit" };
  }

  throw new Error(`unknown_command:Unknown command: ${cmd}`);
};

const compactSnapshot = (
  snapshot: HeadlessSnapshot,
  includeState: boolean,
  options: { redactUnlockDetails?: boolean } = {},
): HeadlessCompactSnapshot => {
  const readModel = options.redactUnlockDetails
    ? {
        ...snapshot.readModel,
        unlockRows: [],
      }
    : snapshot.readModel;
  return {
    mode: snapshot.mode,
    ...(snapshot.activeCalculatorId ? { activeCalculatorId: snapshot.activeCalculatorId } : {}),
    readModel,
    diagnostics: snapshot.diagnostics,
    completedUnlockIds: options.redactUnlockDetails ? [] : snapshot.completedUnlockIds,
    executionActive: snapshot.executionActive,
    executionFlags: snapshot.executionFlags,
    ...(includeState && snapshot.state ? { state: snapshot.state } : {}),
  };
};

const diffValues = (
  before: unknown,
  after: unknown,
  path: string,
  changes: HeadlessSnapshotChange[],
): void => {
  const beforeJson = JSON.stringify(before);
  const afterJson = JSON.stringify(after);
  if (beforeJson === afterJson) {
    return;
  }
  if (isRecord(before) && isRecord(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      diffValues(before[key], after[key], path ? `${path}.${key}` : key, changes);
    }
    return;
  }
  changes.push({ path, before, after });
};

export const diffHeadlessSnapshots = (
  before: HeadlessCompactSnapshot,
  after: HeadlessCompactSnapshot,
): HeadlessSnapshotChange[] => {
  const changes: HeadlessSnapshotChange[] = [];
  diffValues(toJsonCompatible(before), toJsonCompatible(after), "", changes);
  return changes;
};

type HeadlessKeyLocation = "keypad" | "storage" | "keypad_and_storage" | "none";

const resolveListState = (state: GameState, calculatorId?: CalculatorId): GameState => {
  const targetCalculatorId = calculatorId ?? resolveActiveCalculatorId(state);
  if (!isCalculatorId(targetCalculatorId) || !state.calculators?.[targetCalculatorId]) {
    throw new Error(`invalid_calculator:Unknown calculatorId: ${targetCalculatorId}`);
  }
  return projectCalculatorToLegacy(state, targetCalculatorId);
};

const resolveKeyLocation = (state: GameState, key: Key): HeadlessKeyLocation => {
  const onKeypad = isKeyInstalledOnActiveKeypad(state, key);
  const inStorage = state.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === key);
  if (onKeypad && inStorage) {
    return "keypad_and_storage";
  }
  if (onKeypad) {
    return "keypad";
  }
  if (inStorage) {
    return "storage";
  }
  return "none";
};

const resolveKeyPositions = (
  state: GameState,
  key: Key,
): Array<{ surface: "keypad" | "storage"; index: number }> => {
  const positions: Array<{ surface: "keypad" | "storage"; index: number }> = [];
  const keypadLayout = getKeyLayoutForSurface(state, "keypad") ?? [];
  keypadLayout.forEach((cell, index) => {
    if (cell?.kind === "key" && cell.key === key) {
      positions.push({ surface: "keypad", index });
    }
  });
  state.ui.storageLayout.forEach((cell, index) => {
    if (cell?.kind === "key" && cell.key === key) {
      positions.push({ surface: "storage", index });
    }
  });
  return positions;
};

const resolvePressBlockReason = (
  capability: KeyCapability,
  installedOnKeypad: boolean,
): "locked" | "not_installed" | undefined => {
  if (capability === "locked") {
    return "locked";
  }
  if (!installedOnKeypad) {
    return "not_installed";
  }
  return undefined;
};

const listKeys = (
  state: GameState,
  options: { filter?: string; all?: boolean; calculatorId?: CalculatorId } = {},
) => {
  const listState = resolveListState(state, options.calculatorId);
  const normalizedFilter = options.filter?.trim().toLowerCase() ?? "";
  return keyPresentationCatalog
    .filter((entry) => {
      if (!normalizedFilter) {
        return true;
      }
      return entry.keyId.toLowerCase().includes(normalizedFilter)
        || entry.buttonFace.toLowerCase().includes(normalizedFilter);
    })
    .map((entry) => {
      const key = entry.keyId as Key;
      const capability: KeyCapability = resolveKeyCapability(listState, key);
      const location = resolveKeyLocation(listState, key);
      const positions = resolveKeyPositions(listState, key);
      const installedOnKeypad = isKeyInstalledOnActiveKeypad(listState, key);
      const usable = capability !== "locked";
      const pressBlockReason = resolvePressBlockReason(capability, installedOnKeypad);
      return {
        key: entry.keyId,
        label: entry.buttonFace,
        usable,
        capability,
        location,
        positions,
        installedOnKeypad,
        pressable: usable && installedOnKeypad,
        ...(pressBlockReason ? { pressBlockReason } : {}),
      };
    })
    .filter((entry) => options.all === true || entry.usable);
};

const resolveKeyPressability = (
  state: GameState,
  key: Key,
): { usable: boolean; capability: KeyCapability; pressable: boolean; pressBlockReason?: "locked" | "not_installed" } => {
  const capability = resolveKeyCapability(state, key);
  const installedOnKeypad = isKeyInstalledOnActiveKeypad(state, key);
  const usable = capability !== "locked";
  const pressBlockReason = resolvePressBlockReason(capability, installedOnKeypad);
  return {
    usable,
    capability,
    pressable: usable && installedOnKeypad,
    ...(pressBlockReason ? { pressBlockReason } : {}),
  };
};

const buildLayoutCell = (
  state: GameState,
  surface: "keypad" | "storage",
  index: number,
  key: Key | null,
  includeEmpty: boolean,
  normalizedFilter: string,
) => {
  if (!key) {
    return includeEmpty && !normalizedFilter
      ? { index, kind: "empty" }
      : null;
  }
  const presentation = keyPresentationCatalog.find((entry) => entry.keyId === key);
  const label = presentation?.buttonFace ?? key;
  if (
    normalizedFilter
    && !key.toLowerCase().includes(normalizedFilter)
    && !label.toLowerCase().includes(normalizedFilter)
  ) {
    return null;
  }
  return {
    index,
    kind: "key",
    key,
    label,
    surface,
    ...resolveKeyPressability(state, key),
  };
};

const buildSurfaceLayout = (
  state: GameState,
  surface: "keypad" | "storage",
  options: { includeEmpty?: boolean; filter?: string },
) => {
  const normalizedFilter = options.filter?.trim().toLowerCase() ?? "";
  const includeEmpty = options.includeEmpty === true;
  const source = surface === "storage"
    ? state.ui.storageLayout.map((cell) => cell?.key ?? null)
    : (getKeyLayoutForSurface(state, "keypad") ?? []).map((cell) => cell?.kind === "key" ? cell.key : null);
  return {
    surface,
    cells: source
      .map((key, index) => buildLayoutCell(state, surface, index, key, includeEmpty, normalizedFilter))
      .filter((cell): cell is NonNullable<typeof cell> => cell !== null),
  };
};

const layout = (
  state: GameState,
  options: { surface?: LayoutSurface; filter?: string; includeEmpty?: boolean; calculatorId?: CalculatorId } = {},
) => {
  const listState = resolveListState(state, options.calculatorId);
  const targetCalculatorId = resolveActiveCalculatorId(listState);
  const surfaces: Array<"keypad" | "storage"> = options.surface === "storage"
    ? ["storage"]
    : options.surface === undefined || options.surface === "keypad"
      ? options.surface === "keypad" ? ["keypad"] : ["keypad", "storage"]
      : (() => {
          throw new Error("invalid_command:layout currently supports active calculator surfaces keypad and storage.");
        })();
  return {
    calculatorId: targetCalculatorId,
    surfaces: surfaces.map((surface) => buildSurfaceLayout(listState, surface, options)),
  };
};

const readSurfaceKey = (state: GameState, target: HeadlessLayoutTarget): Key | null => {
  if (target.surface === "storage") {
    return state.ui.storageLayout[target.index]?.key ?? null;
  }
  const layout = getKeyLayoutForSurface(state, target.surface);
  const cell = layout?.[target.index];
  return cell?.kind === "key" ? cell.key : null;
};

const buildRejectedFeedback = (
  state: GameState,
  reasonCode: Extract<Extract<UiEffect, { type: "input_feedback" }>["reasonCode"], string>,
): HeadlessFeedback => ({
  uiEffects: [{
    type: "input_feedback",
    calculatorId: resolveActiveCalculatorId(state),
    outcome: "rejected",
    source: "domain_dispatch",
    trigger: "user_action",
    reasonCode,
  }],
  quitRequested: false,
});

const resolveInputFeedbackOutcome = (feedback: HeadlessFeedback): HeadlessActionOutcome => {
  const inputFeedback = feedback.uiEffects.find((effect): effect is Extract<UiEffect, { type: "input_feedback" }> =>
    effect.type === "input_feedback" && effect.trigger === "user_action");
  if (!inputFeedback) {
    return { accepted: false };
  }
  return inputFeedback.outcome === "accepted"
    ? { accepted: true }
    : {
        accepted: false,
        ...(inputFeedback.reasonCode ? { reasonCode: inputFeedback.reasonCode } : {}),
      };
};

const runComparableSignature = (snapshot: HeadlessCompactSnapshot): string =>
  JSON.stringify(toJsonCompatible({
    readModel: snapshot.readModel,
    executionActive: snapshot.executionActive,
    executionFlags: snapshot.executionFlags,
  }));

const errorResponse = (sequence: number, error: unknown): HeadlessErrorResponse => {
  const message = error instanceof Error ? error.message : String(error);
  const separatorIndex = message.indexOf(":");
  if (separatorIndex > 0) {
    return {
      ok: false,
      sequence,
      error: {
        code: message.slice(0, separatorIndex),
        message: message.slice(separatorIndex + 1),
      },
    };
  }
  return {
    ok: false,
    sequence,
    error: {
      code: "runtime_error",
      message,
    },
  };
};

export const createHeadlessJsonlSession = (options: HeadlessJsonlSessionOptions = {}) => {
  const runtime = createHeadlessRuntime({ mode: options.mode });
  let sequence = 0;
  let previousSnapshot = compactSnapshot(runtime.snapshot(), false);
  let closed = false;

  const ready = (): HeadlessSessionReadyResponse => ({
    ok: true,
    sequence: 0,
    event: "session_ready",
    mode: runtime.getMode(),
    supportedCommands: [...SUPPORTED_COMMANDS],
    snapshot: previousSnapshot,
  });

  const buildResponse = (
    command: HeadlessInteractiveCommand,
    feedback: HeadlessFeedback,
    includeState: boolean,
    result?: unknown,
    options: { redactUnlockDetails?: boolean; suppressChanges?: boolean; actionOutcome?: HeadlessActionOutcome } = {},
  ): HeadlessOkResponse => {
    const nextSnapshot = compactSnapshot(runtime.snapshot({ includeState }), includeState, {
      redactUnlockDetails: options.redactUnlockDetails,
    });
    const comparableSnapshot = compactSnapshot(runtime.snapshot(), false);
    const response: HeadlessOkResponse = {
      ok: true,
      sequence,
      command,
      feedback,
      snapshot: nextSnapshot,
      changes: options.suppressChanges ? [] : diffHeadlessSnapshots(previousSnapshot, comparableSnapshot),
      ...(options.actionOutcome ? { accepted: options.actionOutcome.accepted } : {}),
      ...(options.actionOutcome?.reasonCode ? { reasonCode: options.actionOutcome.reasonCode } : {}),
      ...(result !== undefined ? { result } : {}),
    };
    previousSnapshot = comparableSnapshot;
    return response;
  };

  const handleCommand = (command: HeadlessInteractiveCommand): HeadlessInteractiveResponse => {
    if (closed) {
      return errorResponse(sequence, new Error("session_closed:Session is closed."));
    }

    if (command.cmd === "help") {
      return buildResponse(command, { uiEffects: [], quitRequested: false }, false, HELP_RESULT);
    }
    if (command.cmd === "listKeys") {
      return buildResponse(command, { uiEffects: [], quitRequested: false }, false, {
        keys: listKeys(runtime.getState(), command),
      });
    }
    if (command.cmd === "layout") {
      return buildResponse(command, { uiEffects: [], quitRequested: false }, false, {
        layout: layout(runtime.getState(), command),
      });
    }
    if (command.cmd === "press") {
      if (!isKeyId(command.key)) {
        throw new Error(`invalid_key:Unknown key: ${command.key}`);
      }
      const result = runtime.press(command.key as KeyInput, command.calculatorId);
      const feedback = {
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      };
      return buildResponse(command, feedback, false, undefined, {
        actionOutcome: resolveInputFeedbackOutcome(feedback),
      });
    }
    if (command.cmd === "action") {
      const result = runtime.dispatch(command.action);
      return buildResponse(command, {
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      }, false);
    }
    if (command.cmd === "unlockAll") {
      const result = runtime.dispatch({ type: "UNLOCK_ALL" });
      const unlockedCount = result.state.completedUnlockIds.length;
      return buildResponse(command, {
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      }, false, {
        message: "all keys unlocked",
        unlockedCount,
        layoutChanged: true,
      }, {
        redactUnlockDetails: command.verbose !== true,
        suppressChanges: command.verbose !== true,
      });
    }
    if (command.cmd === "drop") {
      const state = runtime.getState();
      const sourceKey = readSurfaceKey(state, command.source);
      const action = classifyDropAction(
        state,
        command.source,
        command.destination,
        sourceKey,
        { debugUnlockBypass: Boolean(state.ui.buttonFlags[DEBUG_UNLOCK_BYPASS_FLAG]) },
      );
      if (!sourceKey || !action) {
        const feedback = buildRejectedFeedback(state, "layout_invalid_or_noop");
        return buildResponse(command, feedback, false, {
          action: null,
          dispatchedAction: null,
        }, {
          actionOutcome: resolveInputFeedbackOutcome(feedback),
        });
      }
      const dispatchedAction = buildLayoutDropDispatchAction(command.source, sourceKey, command.destination, action, {
        allowLockedInstall: Boolean(state.ui.buttonFlags[DEBUG_UNLOCK_BYPASS_FLAG]),
      });
      const result = runtime.dispatch(dispatchedAction);
      const feedback = {
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      };
      return buildResponse(command, feedback, false, {
        action,
        dispatchedAction,
      }, {
        actionOutcome: resolveInputFeedbackOutcome(feedback),
      });
    }
    if (command.cmd === "run") {
      const maxTicks = command.maxTicks ?? 100;
      const stopWhenIdle = command.stopWhenIdle ?? true;
      const uiEffects: UiEffect[] = [];
      let ticks = 0;
      let stoppedReason: "idle" | "inactive" | "maxTicks" = "maxTicks";
      while (ticks < maxTicks) {
        const before = compactSnapshot(runtime.snapshot(), false);
        if (!before.executionActive) {
          stoppedReason = "inactive";
          break;
        }
        const result = runtime.dispatch({ type: "AUTO_STEP_TICK" });
        ticks += 1;
        uiEffects.push(...result.uiEffects);
        const after = compactSnapshot(runtime.snapshot(), false);
        if (!after.executionActive) {
          stoppedReason = "inactive";
          break;
        }
        if (stopWhenIdle && runComparableSignature(before) === runComparableSignature(after)) {
          stoppedReason = "idle";
          break;
        }
      }
      if (ticks >= maxTicks) {
        stoppedReason = "maxTicks";
      }
      return buildResponse(command, {
        uiEffects,
        quitRequested: runtime.snapshot().quitRequested,
      }, false, {
        ticks,
        stoppedReason,
      });
    }
    if (command.cmd === "snapshot") {
      return buildResponse(command, { uiEffects: [], quitRequested: false }, Boolean(command.includeState));
    }
    if (command.cmd === "tick") {
      if (command.calculatorId && !isCalculatorId(command.calculatorId)) {
        throw new Error(`invalid_calculator:Unknown calculatorId: ${command.calculatorId}`);
      }
      const result = runtime.dispatch({
        type: "AUTO_STEP_TICK",
        ...(command.calculatorId ? { calculatorId: command.calculatorId } : {}),
      });
      return buildResponse(command, {
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      }, false);
    }
    if (command.cmd === "exit") {
      closed = true;
      return buildResponse(command, { uiEffects: [], quitRequested: false }, false, { exited: true });
    }
    return assertNever(command);
  };

  const handleLine = (line: string): HeadlessInteractiveResponse => {
    sequence += 1;
    try {
      return handleCommand(parseHeadlessInteractiveCommand(line));
    } catch (error) {
      return errorResponse(sequence, error);
    }
  };

  return {
    ready,
    handleLine,
    dispose: (): void => {
      closed = true;
      runtime.dispose();
    },
    isClosed: (): boolean => closed,
  };
};

export const serializeHeadlessJson = (value: unknown): string =>
  JSON.stringify(
    value,
    (_key, entry) => (typeof entry === "bigint" ? entry.toString() : entry),
  );

export const runHeadlessJsonlSession = (options: HeadlessJsonlSessionOptions = {}): void => {
  const session = createHeadlessJsonlSession(options);
  const write = (value: unknown): void => {
    process.stdout.write(`${serializeHeadlessJson(value)}\n`);
  };
  write(session.ready());

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", (line) => {
    const response = session.handleLine(line);
    write(response);
    if (response.ok && response.command.cmd === "exit") {
      rl.close();
    }
  });

  rl.on("close", () => {
    session.dispose();
  });
};
