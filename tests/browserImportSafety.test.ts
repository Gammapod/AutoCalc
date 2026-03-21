import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runBrowserImportSafetyTests = (): void => {
  const euclideanEngineSource = readFileSync(
    join(process.cwd(), "src", "infra", "math", "euclideanEngine.ts"),
    "utf8",
  );

  assert.doesNotMatch(
    euclideanEngineSource,
    /from\s+["']\.\/algebrite\.js["']/,
    "euclidean engine must not statically import algebrite to keep browser boot path loadable",
  );

  assert.doesNotMatch(
    euclideanEngineSource,
    /from\s+["']algebrite["']/,
    "euclidean engine must not import bare algebrite specifier in browser path",
  );
};

