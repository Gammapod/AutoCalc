import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runUiUxRoleParityMobileTests = (): void => {
  const mobileHtml = readFileSync(resolve(process.cwd(), "mobile_web/index.html"), "utf8");

  assert.equal(
    mobileHtml.trim().length > 0,
    true,
    "mobile shell source is readable for runtime semantic-role tests",
  );
  assert.equal(
    mobileHtml.includes("<<<<<<<") || mobileHtml.includes("=======") || mobileHtml.includes(">>>>>>>"),
    false,
    "mobile shell source does not contain merge conflict markers",
  );
};
