import type { NumberDomainNodeId, UnlockDefinition, UnlockPredicate } from "../domain/types.js";

const assertKnownPredicate = (unlockId: string, predicate: UnlockPredicate): never => {
  throw new Error(
    `Cannot resolve number domain for unlock "${unlockId}" with predicate "${(predicate as { type?: string }).type ?? "unknown"}". Add domainNodeId override in unlock catalog.`,
  );
};

export const resolveUnlockDomainNodeId = (unlock: UnlockDefinition): NumberDomainNodeId => {
  if (unlock.domainNodeId) {
    return unlock.domainNodeId;
  }

  const { predicate } = unlock;

  if (predicate.type === "total_equals" || predicate.type === "total_at_least" || predicate.type === "total_at_most") {
    return predicate.value < 0n ? "NZ" : "NN";
  }

  if (predicate.type === "roll_ends_with_sequence") {
    return predicate.sequence.some((value) => value < 0n) ? "NZ" : "NN";
  }

  if (predicate.type === "roll_length_at_least") {
    return "NN";
  }

  if (predicate.type === "operation_equals") {
    return predicate.slots.some((slot) => slot.operand < 0n) ? "NZ" : "NN";
  }

  return assertKnownPredicate(unlock.id, predicate);
};
