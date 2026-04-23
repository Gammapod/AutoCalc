import { getAppServices } from "../../../contracts/appServices.js";
import { evaluateUnlockPredicate } from "../../../domain/unlockEngine.js";
import type { GameState, UnlockDefinition, UnlockPredicate } from "../../../domain/types.js";

export const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

export const toFiniteNumber = (value: bigint): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const resolveNearnessRadius = (target: number): number => Math.max(3, Math.abs(target) / 4);

export type HintNearness = {
  distance: number;
  radius: number;
  opacity01: number;
  inRange: boolean;
};

export const resolveNearness = (current: number, target: number): HintNearness => {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safeTarget = Number.isFinite(target) ? target : 0;
  const distance = Math.abs(safeCurrent - safeTarget);
  const radius = resolveNearnessRadius(safeTarget);
  const inRange = distance <= radius;
  const opacity01 = clamp01(1 - (distance / radius));
  return { distance, radius, opacity01, inRange };
};

export const resolveUnresolvedHintCandidates = <T extends UnlockPredicate["type"]>(
  state: GameState,
  predicateTypes: readonly T[],
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): Array<UnlockDefinition & { predicate: Extract<UnlockPredicate, { type: T }> }> => {
  const typeSet = new Set(predicateTypes);
  const completed = new Set(state.completedUnlockIds);
  return catalog
    .filter((unlock): unlock is UnlockDefinition & { predicate: Extract<UnlockPredicate, { type: T }> } =>
      typeSet.has(unlock.predicate.type as T))
    .filter((unlock) => !completed.has(unlock.id))
    .filter((unlock) => !evaluateUnlockPredicate(unlock.predicate, state))
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const resolveFirstUnresolvedHintCandidate = <T extends UnlockPredicate["type"]>(
  state: GameState,
  predicateTypes: readonly T[],
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): (UnlockDefinition & { predicate: Extract<UnlockPredicate, { type: T }> }) | null =>
  resolveUnresolvedHintCandidates(state, predicateTypes, catalog)[0] ?? null;
