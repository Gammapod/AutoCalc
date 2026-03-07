export const stableSerialize = (value: unknown): string => {
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
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        if (key === "valueAtoms" || key === "valueCompose" || key === "memoryVariable") {
          continue;
        }
        out[key] = walk(obj[key]);
      }
      return out;
    }
    return input;
  };

  return JSON.stringify(walk(value));
};
