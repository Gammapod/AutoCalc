import { getAppServices } from "../../../contracts/appServices.js";
import type { ReleaseNoteEntry } from "../../../contracts/releaseNotes.js";
import type { GameState } from "../../../domain/types.js";
import { APP_VERSION } from "../../../generated/appVersion.js";

const resolveAppVersion = (): string => {
  if (typeof document === "undefined") {
    return `v${APP_VERSION}`;
  }
  const versionToken = document.body.dataset.appVersion?.trim();
  if (!versionToken) {
    return `v${APP_VERSION}`;
  }
  return versionToken.startsWith("v") ? versionToken : `v${versionToken}`;
};

const normalizeVersion = (version: string): string =>
  version
    .trim()
    .toLowerCase()
    .replace(/^v/, "")
    .split(/[+-]/, 1)[0] ?? "";

const parseVersionParts = (version: string): number[] => {
  const normalized = normalizeVersion(version);
  if (!normalized) {
    return [];
  }
  return normalized.split(".").map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
};

const compareVersionParts = (left: readonly number[], right: readonly number[]): number => {
  const limit = Math.max(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
};

type ResolvedReleaseNote = {
  note: ReleaseNoteEntry | null;
  sourceVersion: string | null;
  usedFallback: boolean;
};

const resolveCurrentReleaseNote = (): ResolvedReleaseNote => {
  const notes = getAppServices().contentProvider.releaseNotes.entries;
  const appVersion = resolveAppVersion();
  const currentVersion = normalizeVersion(appVersion);
  const currentParts = parseVersionParts(appVersion);

  const exact = notes.find((entry) => normalizeVersion(entry.releaseVersion) === currentVersion) ?? null;
  if (exact) {
    return { note: exact, sourceVersion: exact.releaseVersion, usedFallback: false };
  }

  let fallback: ReleaseNoteEntry | null = null;
  let fallbackParts: number[] = [];
  for (const entry of notes) {
    const entryParts = parseVersionParts(entry.releaseVersion);
    if (entryParts.length === 0) {
      continue;
    }
    if (compareVersionParts(entryParts, currentParts) >= 0) {
      continue;
    }
    if (!fallback || compareVersionParts(entryParts, fallbackParts) > 0) {
      fallback = entry;
      fallbackParts = entryParts;
    }
  }

  return {
    note: fallback,
    sourceVersion: fallback ? fallback.releaseVersion : null,
    usedFallback: Boolean(fallback),
  };
};

export const clearReleaseNotesVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderReleaseNotesVisualizerPanel = (root: Element, _state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const appVersion = resolveAppVersion();
  const resolved = resolveCurrentReleaseNote();
  const note = resolved.note;

  if (resolved.usedFallback && resolved.sourceVersion) {
    console.warn(
      `[release-notes] Missing release notes for ${appVersion}; showing ${resolved.sourceVersion} instead.`,
    );
  }

  if (typeof document === "undefined") {
    if (!note) {
      panel.textContent = `${appVersion} no release notes available`;
      return;
    }
    panel.textContent = `${appVersion} ${note.title}: ${note.summary}`;
    return;
  }

  const version = document.createElement("div");
  version.className = "v2-title-version";
  version.textContent = resolved.usedFallback && resolved.sourceVersion
    ? `${appVersion} (showing ${resolved.sourceVersion})`
    : appVersion;

  const body = document.createElement("div");
  body.className = "v2-release-notes-body";

  const heading = document.createElement("div");
  heading.className = "v2-release-notes-heading";
  heading.textContent = note ? note.title : "Release Notes";
  body.appendChild(heading);

  const summary = document.createElement("div");
  summary.className = "v2-release-notes-summary";
  summary.textContent = note ? note.summary : "No release notes are configured for this version yet.";
  body.appendChild(summary);

  if (note && note.bullets.length > 0) {
    const bulletList = document.createElement("div");
    bulletList.className = "v2-release-notes-list";
    for (const bullet of note.bullets) {
      const item = document.createElement("div");
      item.className = "v2-release-notes-item";
      item.textContent = `- ${bullet}`;
      bulletList.appendChild(item);
    }
    body.appendChild(bulletList);
  }

  panel.append(version, body);
};
