import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHeadlessRuntime } from "./headlessRuntime.js";
import { runHeadlessJsonlSession, serializeHeadlessJson } from "./headlessSession.js";
import { isKeyId } from "../domain/keyPresentation.js";
import type { AppMode } from "../contracts/appMode.js";
import type { Action, KeyInput } from "../domain/types.js";

type CliOptions = {
  mode: AppMode;
  actions: Action[];
  includeState: boolean;
  interactive: boolean;
};

const VALID_MODES = new Set<AppMode>(["game", "sandbox", "main_menu"]);

const usage = `Usage:
  node ./dist/src/app/headlessCli.js [--mode=game|sandbox|main_menu] [--interactive] [--unlock-all] [--press=key,key] [--actions='[...]'] [--file=commands.json] [--state]

Examples:
  node ./dist/src/app/headlessCli.js --interactive --mode=game
  node ./dist/src/app/headlessCli.js --unlock-all --press=digit_1,op_add
  node ./dist/src/app/headlessCli.js --mode=sandbox --file=commands.json --state`;

const parseMode = (value: string): AppMode => {
  if (VALID_MODES.has(value as AppMode)) {
    return value as AppMode;
  }
  throw new Error(`Invalid mode "${value}". Expected game, sandbox, or main_menu.`);
};

const assertActionArray = (value: unknown): Action[] => {
  if (!Array.isArray(value)) {
    throw new Error("Expected a JSON array of actions.");
  }
  return value as Action[];
};

const parseActionsJson = (raw: string): Action[] => assertActionArray(JSON.parse(raw));

const parseActionsFile = (path: string): Action[] => {
  const filePath = resolve(process.cwd(), path);
  return parseActionsJson(readFileSync(filePath, "utf8"));
};

const parsePressList = (raw: string): Action[] => {
  const keys = raw.split(",").map((key) => key.trim()).filter((key) => key.length > 0);
  return keys.map((key) => {
    if (!isKeyId(key)) {
      throw new Error(`Invalid key id in --press list: ${key}`);
    }
    return { type: "PRESS_KEY", key: key as KeyInput };
  });
};

const parseArgs = (argv: string[]): CliOptions => {
  let mode: AppMode = "game";
  let includeState = false;
  let interactive = false;
  const actionBatches: Action[][] = [];

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--state") {
      includeState = true;
      continue;
    }
    if (arg === "--interactive") {
      interactive = true;
      continue;
    }
    if (arg === "--unlock-all") {
      actionBatches.push([{ type: "UNLOCK_ALL" }]);
      continue;
    }
    if (arg.startsWith("--mode=")) {
      mode = parseMode(arg.slice("--mode=".length));
      continue;
    }
    if (arg.startsWith("--actions=")) {
      actionBatches.push(parseActionsJson(arg.slice("--actions=".length)));
      continue;
    }
    if (arg.startsWith("--file=")) {
      actionBatches.push(parseActionsFile(arg.slice("--file=".length)));
      continue;
    }
    if (arg.startsWith("--press=")) {
      actionBatches.push(parsePressList(arg.slice("--press=".length)));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    mode,
    actions: actionBatches.flat(),
    includeState,
    interactive,
  };
};

const toJson = (value: unknown): string =>
  JSON.stringify(
    value,
    (_key, entry) => (typeof entry === "bigint" ? entry.toString() : entry),
    2,
  );

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.interactive) {
    runHeadlessJsonlSession({ mode: options.mode });
  } else {
    const runtime = createHeadlessRuntime({ mode: options.mode });
    const results = options.actions.map((action) => runtime.dispatch(action));
    const snapshot = runtime.snapshot({ includeState: options.includeState });
    runtime.dispose();
    console.log(toJson({
      mode: snapshot.mode,
      actionCount: options.actions.length,
      results: results.map((result) => ({
        action: result.action,
        mode: result.mode,
        readModel: result.readModel,
        uiEffects: result.uiEffects,
        quitRequested: result.quitRequested,
      })),
      snapshot,
    }));
  }
} catch (error) {
  const interactiveRequested = process.argv.slice(2).includes("--interactive");
  if (interactiveRequested) {
    console.log(serializeHeadlessJson({
      ok: false,
      sequence: 0,
      error: {
        code: "startup_error",
        message: error instanceof Error ? error.message : String(error),
      },
    }));
  } else {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage);
  }
  process.exitCode = 1;
}
