// Legacy migration API retained for compatibility with older tooling/tests.
// Runtime save-load now uses current schema only and does not run historical migrations.

export type SerializableSlot = {
  operator: string;
  operand: string;
};

export type SerializableStateV1 = Record<string, unknown>;
export type SerializableStateV2 = SerializableStateV1;
export type SerializableStateV3 = SerializableStateV2 & {
  operationSlots?: SerializableSlot[];
};
export type SerializableStateV14 = Record<string, unknown>;

export const migrateV1ToV2 = (input: SerializableStateV1): SerializableStateV2 => ({ ...input });

export const migrateV2ToV3 = (input: SerializableStateV2): SerializableStateV3 => ({ ...input });

export const isValidSchemaVersion = (version: unknown): version is number =>
  typeof version === "number" && Number.isInteger(version) && version > 0;

export const validateSerializableStateV3 = (state: unknown): state is SerializableStateV3 =>
  typeof state === "object" && state !== null;

export const migrateToLatest = (_schemaVersion: number, _state: unknown): SerializableStateV14 | null => null;
