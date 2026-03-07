import type { GameState } from "../domain/types.js";
import { buildReadModel } from "../domain/projections.js";

type ParityMismatch = {
  kind: "state" | "read_model";
  legacy: string;
  next: string;
};

export type ParityResult = {
  ok: boolean;
  mismatches: ParityMismatch[];
};

const stableSerialize = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const walk = (input: unknown): unknown => {
    if (typeof input === "bigint") {
      return { __bigint: input.toString() };
    }
    if (Array.isArray(input)) {
      return input.map((entry) => walk(entry));
    }
    if (input && typeof input === "object") {
      if (seen.has(input as object)) {
        return "[Circular]";
      }
      seen.add(input as object);
      const obj = input as Record<string, unknown>;
      const orderedKeys = Object.keys(obj).sort();
      const out: Record<string, unknown> = {};
      for (const key of orderedKeys) {
        out[key] = walk(obj[key]);
      }
      return out;
    }
    return input;
  };
  return JSON.stringify(walk(value));
};

export const compareParity = (legacyState: GameState, v2State: GameState): ParityResult => {
  const mismatches: ParityMismatch[] = [];

  const legacySerialized = stableSerialize(legacyState);
  const v2Serialized = stableSerialize(v2State);
  if (legacySerialized !== v2Serialized) {
    mismatches.push({
      kind: "state",
      legacy: legacySerialized,
      next: v2Serialized,
    });
  }

  const legacyReadModel = stableSerialize(buildReadModel(legacyState));
  const nextReadModel = stableSerialize(buildReadModel(v2State));
  if (legacyReadModel !== nextReadModel) {
    mismatches.push({
      kind: "read_model",
      legacy: legacyReadModel,
      next: nextReadModel,
    });
  }

  return { ok: mismatches.length === 0, mismatches };
};
