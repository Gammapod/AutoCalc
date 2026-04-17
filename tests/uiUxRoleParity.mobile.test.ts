import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runUiUxRoleParityMobileTests = (): void => {
  const mobileHtml = readFileSync(resolve(process.cwd(), "mobile_web/index.html"), "utf8");

  assert.equal(
    mobileHtml.includes("--ux-role-error-color")
      && mobileHtml.includes("--ux-role-imaginary-color")
      && mobileHtml.includes("--ux-role-unlock-color")
      && mobileHtml.includes("--ux-role-analysis-color")
      && mobileHtml.includes("--ux-role-help-color")
      && mobileHtml.includes("--ux-role-default-color"),
    true,
    "mobile_web defines the shared ux-role color tokens",
  );

  assert.equal(
    mobileHtml.includes("[data-ux-role=\"error\"]")
      && mobileHtml.includes("[data-ux-role=\"imaginary\"]")
      && mobileHtml.includes("[data-ux-role=\"unlock\"]")
      && mobileHtml.includes("[data-ux-role=\"analysis\"]")
      && mobileHtml.includes("[data-ux-role=\"help\"]")
      && mobileHtml.includes("[data-ux-state=\"placeholder\"]"),
    true,
    "mobile_web includes role/state selectors for role-driven semantic coloring",
  );
};
