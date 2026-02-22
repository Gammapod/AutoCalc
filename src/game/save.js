import { createInitialState, SAVE_VERSION } from "./state.js";

export const SAVE_KEY = "autocalc.v0_1.save";

function serialize(state) {
  return {
    version: SAVE_VERSION,
    totalEarned: state.totalEarned.toString(),
    unlocked: {
      digit2: Boolean(state.unlocked.digit2)
    },
    calculator: {
      display: String(state.calculator.display),
      entry: String(state.calculator.entry),
      accumulator: state.calculator.accumulator == null ? null : state.calculator.accumulator.toString(),
      pendingOp: state.calculator.pendingOp,
      justEvaluated: Boolean(state.calculator.justEvaluated)
    }
  };
}

function parseBigIntOrNull(value) {
  if (value == null) {
    return null;
  }
  return BigInt(value);
}

function parse(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (raw.version !== SAVE_VERSION) {
    return null;
  }

  const state = createInitialState();
  return {
    ...state,
    totalEarned: BigInt(raw.totalEarned ?? "0"),
    unlocked: {
      ...state.unlocked,
      digit2: Boolean(raw.unlocked?.digit2)
    },
    calculator: {
      ...state.calculator,
      display: String(raw.calculator?.display ?? "0"),
      entry: String(raw.calculator?.entry ?? ""),
      accumulator: parseBigIntOrNull(raw.calculator?.accumulator),
      pendingOp: raw.calculator?.pendingOp ?? null,
      justEvaluated: Boolean(raw.calculator?.justEvaluated)
    }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw);
    return parse(parsed) ?? createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  const payload = serialize(state);
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
