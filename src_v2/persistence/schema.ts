import type { SerializableStateV3 } from "../../src/infra/persistence/migrations.js";

export type SaveEnvelopeV3 = {
  schemaVersion: 3;
  savedAt: number;
  state: SerializableStateV3;
};
