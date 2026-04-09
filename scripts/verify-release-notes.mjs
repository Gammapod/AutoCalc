import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const plannedReleasesCandidates = [
  "docs/planning/Planned Releases.md",
  "docs/planning/Planning Board.md",
];

const plannedReleasesPath = plannedReleasesCandidates
  .map((candidate) => resolve(process.cwd(), candidate))
  .find((candidatePath) => existsSync(candidatePath));

const releaseNotesCatalogPath = resolve(process.cwd(), "src/content/releaseNotes.ts");

if (!plannedReleasesPath) {
  console.error("Release notes policy check failed.");
  console.error("Could not find a planning document. Checked:");
  for (const candidate of plannedReleasesCandidates) {
    console.error(`- ${candidate}`);
  }
  process.exit(1);
}

const plannedReleasesText = readFileSync(plannedReleasesPath, "utf8");
const releaseNotesCatalogText = readFileSync(releaseNotesCatalogPath, "utf8");

const lines = plannedReleasesText.split(/\r?\n/);

const findSectionRange = (heading) => {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) {
    return null;
  }
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return { start, end: end >= 0 ? end : lines.length };
};

const shippedRange = findSectionRange("## Shipped Trains");
if (!shippedRange) {
  console.error("Release notes policy check failed.");
  console.error("- Missing required section: ## Shipped Trains");
  process.exit(1);
}

const shippedLines = lines.slice(shippedRange.start + 1, shippedRange.end);

const trainIndexes = shippedLines
  .map((line, index) => (/^###\s+Train\s+/.test(line.trim()) ? index : -1))
  .filter((index) => index >= 0);

const trainBlocks = trainIndexes.map((start, blockIndex) => {
  const end = blockIndex + 1 < trainIndexes.length ? trainIndexes[blockIndex + 1] : shippedLines.length;
  const heading = shippedLines[start].trim();
  const bodyLines = shippedLines.slice(start + 1, end);
  return { heading, bodyLines };
});

const catalogIds = Array.from(releaseNotesCatalogText.matchAll(/id:\s*"([^"]+)"/g)).map((match) => match[1]);

const failures = [];
const shippedReleaseNoteIds = [];

for (const block of trainBlocks) {
  const releaseNoteHeaderIndex = block.bodyLines.findIndex((line) => /^\s*-\s*Release Note IDs:\s*$/.test(line));
  if (releaseNoteHeaderIndex < 0) {
    failures.push(`${block.heading}: missing '- Release Note IDs:'`);
    continue;
  }

  const releaseNoteIds = [];
  for (let index = releaseNoteHeaderIndex + 1; index < block.bodyLines.length; index += 1) {
    const line = block.bodyLines[index];
    if (/^\s*-\s*Player-facing highlights:\s*$/.test(line)) {
      break;
    }
    if (/^\s*-\s*(Included Slice IDs|Release Note IDs):\s*$/.test(line)) {
      break;
    }
    const idMatch = line.match(/`([^`]+)`/);
    if (idMatch) {
      releaseNoteIds.push(idMatch[1]);
    }
  }

  if (releaseNoteIds.length === 0) {
    failures.push(`${block.heading}: Release Note IDs list is empty`);
    continue;
  }

  shippedReleaseNoteIds.push(...releaseNoteIds);
}

const missingCatalogIds = shippedReleaseNoteIds.filter((id) => !catalogIds.includes(id));
if (missingCatalogIds.length > 0) {
  failures.push(
    `Release Note IDs not found in src/content/releaseNotes.ts: ${missingCatalogIds.join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Release notes policy check failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Release notes policy check passed (${trainBlocks.length} shipped train block(s), ${shippedReleaseNoteIds.length} Release Note ID(s) validated).`,
);
