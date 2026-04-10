import type { Digit, GameState, Key } from "./types.js";

export const isMemoryKey = (_key: Key): boolean => false;
export const cycleMemoryVariable = (state: GameState): GameState => state;
export const resolveMemoryRecallDigit = (_state: GameState): Digit | null => null;
export const applyMemoryAdjust = (state: GameState, _delta: 1 | -1): GameState => state;

export const isMemoryCycleKey = (_key: Key): boolean => false;
export const isMemoryRecallKey = (_key: Key): boolean => false;
export const isMemoryPlusKey = (_key: Key): boolean => false;
export const isMemoryMinusKey = (_key: Key): boolean => false;
