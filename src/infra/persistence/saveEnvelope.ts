export type SavePayload<State = unknown> = {
  schemaVersion: number;
  savedAt: number;
  state: State;
};

export type KeyValueStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type BigIntEnvelope = { __autocalc_bigint__: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const serializeEnvelope = (payload: SavePayload): string => {
  const bigintReplacer = (_key: string, value: unknown): unknown => {
    if (typeof value === "bigint") {
      const wrapped: BigIntEnvelope = { __autocalc_bigint__: value.toString() };
      return wrapped;
    }
    return value;
  };
  return JSON.stringify(payload, bigintReplacer);
};

export const cloneWithBigIntReviver = <T>(value: T): T => {
  const bigintReviver = (_key: string, parsed: unknown): unknown => {
    if (
      isObject(parsed)
      && Object.keys(parsed).length === 1
      && typeof parsed.__autocalc_bigint__ === "string"
    ) {
      try {
        return BigInt(parsed.__autocalc_bigint__);
      } catch {
        return parsed;
      }
    }
    return parsed;
  };
  return JSON.parse(JSON.stringify(value), bigintReviver) as T;
};

export const parseEnvelope = (
  raw: string,
): { payload: SavePayload | null; reason: "invalid_json" | "invalid_payload_envelope" | null } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { payload: null, reason: "invalid_json" };
  }
  if (!isObject(parsed)) {
    return { payload: null, reason: "invalid_payload_envelope" };
  }
  if (!("schemaVersion" in parsed) || !("state" in parsed) || typeof parsed.schemaVersion !== "number" || !Number.isInteger(parsed.schemaVersion)) {
    return { payload: null, reason: "invalid_payload_envelope" };
  }
  return {
    payload: {
      schemaVersion: parsed.schemaVersion,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      state: parsed.state,
    },
    reason: null,
  };
};
