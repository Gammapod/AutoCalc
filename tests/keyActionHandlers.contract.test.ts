import assert from "node:assert/strict";
import { keyRuntimeCatalog } from "../src/content/keyRuntimeCatalog.js";
import { listBehaviorHandlerIds, resolveKeyActionHandlerId } from "../src/domain/keyActionHandlers.js";

export const runKeyActionHandlersContractTests = (): void => {
  const behaviorKindsInCatalog = new Set(keyRuntimeCatalog.map((entry) => entry.behaviorKind));
  const behaviorHandlers = listBehaviorHandlerIds();
  for (const kind of behaviorKindsInCatalog) {
    assert.ok(
      behaviorHandlers[kind],
      `behavior kind ${kind} must resolve to a registered default key-action handler`,
    );
  }

  for (const entry of keyRuntimeCatalog) {
    const handlerId = resolveKeyActionHandlerId(entry.key);
    assert.ok(handlerId, `key ${entry.key} must resolve to a key-action handler`);
  }
};
