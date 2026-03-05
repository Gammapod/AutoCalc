export type SeededFuzzConfig = {
  seed: number;
  steps: number;
};

export const SEEDED_PARITY_RUNS: SeededFuzzConfig[] = [
  { seed: 1337, steps: 120 },
  { seed: 424242, steps: 120 },
  { seed: 9001, steps: 120 },
];
