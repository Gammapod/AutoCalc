import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readDoc = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

export const runStoragePaletteContractTests = (): void => {
  const functionalSpec = readDoc("docs/functional-spec.md");
  const plannedReleases = readDoc("docs/planning/Planned Releases.md");
  const releasedMilestones = readDoc("docs/planning/archive/Released_Milestones.md");
  const combined = `${functionalSpec}\n${plannedReleases}\n${releasedMilestones}`;
  const contains = (pattern: RegExp): boolean => pattern.test(combined);

  assert.equal(
    contains(/Storage shows every unlocked key and only unlocked keys/i),
    true,
    "contract text states storage shows every unlocked key",
  );
  assert.equal(
    contains(/Installed keypad key identity is unique per calculator by key ID/i),
    true,
    "contract text states per-calculator uniqueness is key-ID based",
  );
  assert.equal(
    contains(/Keys can be uninstalled by dragging off calculator surface(s)?/i),
    true,
    "contract text states off-calculator drop can uninstall keys",
  );
  assert.equal(
    contains(/Dropping a storage key on an occupied keypad slot.*replaces the destination key/i),
    true,
    "contract text states occupied-slot storage install replaces destination key",
  );
  assert.equal(
    contains(/(Uninstall can remove any key|including executor keys such as `exec_equals`)/i),
    true,
    "contract text states uninstall is allowed for any key including executor keys",
  );
};
