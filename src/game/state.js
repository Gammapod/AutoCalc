export const SAVE_VERSION = 1;
export const UNLOCK_COST_DIGIT_2 = 25n;
export const AUTOSAVE_INTERVAL_MS = 5000;

export function createInitialState() {
  return {
    calculator: {
      display: "0",
      entry: "",
      accumulator: null,
      pendingOp: null,
      justEvaluated: false
    },
    totalEarned: 0n,
    unlocked: {
      digit2: false
    }
  };
}
