import type { NumberDomainNodeId, UnlockDefinition } from "../domain/types.js";

export const resolveUnlockDomainNodeId = (unlock: UnlockDefinition): NumberDomainNodeId => {
  return unlock.domainNodeId;
};
