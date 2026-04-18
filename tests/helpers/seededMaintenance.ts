export const createSeededMaintenanceRng = (seed: number): (() => number) => {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
};

