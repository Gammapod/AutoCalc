import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const plannedReleasesPath = resolve(process.cwd(), "docs/planning/Planned Releases.md");
const releaseNotesCatalogPath = resolve(process.cwd(), "src/content/releaseNotes.ts");

const plannedReleasesText = readFileSync(plannedReleasesPath, "utf8");
const releaseNotesCatalogText = readFileSync(releaseNotesCatalogPath, "utf8");

const lines = plannedReleasesText.split(/\r?\n/);
const headingIndexes = lines
  .map((line, index) => (line.startsWith("# Release ") ? index : -1))
  .filter((index) => index >= 0);

const releaseBlocks = headingIndexes.map((startIndex, blockIndex) => {
  const endIndex = blockIndex + 1 < headingIndexes.length ? headingIndexes[blockIndex + 1] : lines.length;
  const heading = lines[startIndex];
  const body = lines.slice(startIndex, endIndex).join("\n");
  return { heading, body };
});

const plannedBlocks = releaseBlocks.filter(({ heading }) => !heading.includes("Content Backlog"));

const missingReleaseNotesSection = [];
const missingReleaseNoteId = [];
const plannedReleaseNoteIds = [];

for (const block of plannedBlocks) {
  if (!/^### Release Notes$/m.test(block.body)) {
    missingReleaseNotesSection.push(block.heading);
  }

  const noteIdMatch = block.body.match(/Release Note ID:\s*`([^`]+)`/i);
  if (!noteIdMatch) {
    missingReleaseNoteId.push(block.heading);
    continue;
  }
  plannedReleaseNoteIds.push(noteIdMatch[1]);
}

const catalogIds = Array.from(releaseNotesCatalogText.matchAll(/id:\s*"([^"]+)"/g)).map((match) => match[1]);
const missingCatalogIds = plannedReleaseNoteIds.filter((id) => !catalogIds.includes(id));

const failures = [];
if (missingReleaseNotesSection.length > 0) {
  failures.push(`Missing '### Release Notes' section for: ${missingReleaseNotesSection.join(", ")}`);
}
if (missingReleaseNoteId.length > 0) {
  failures.push(`Missing 'Release Note ID' line for: ${missingReleaseNoteId.join(", ")}`);
}
if (missingCatalogIds.length > 0) {
  failures.push(`Release Note IDs not found in src/content/releaseNotes.ts: ${missingCatalogIds.join(", ")}`);
}

if (failures.length > 0) {
  console.error("Release notes policy check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release notes policy check passed (${plannedBlocks.length} planned release block(s) validated).`);
