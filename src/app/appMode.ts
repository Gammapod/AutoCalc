import type { AppMode } from "../contracts/appMode.js";
export type { AppMode } from "../contracts/appMode.js";

type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

const VALID_MODES = new Set<AppMode>(["game", "sandbox"]);

const toAppMode = (value: unknown): AppMode | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_MODES.has(normalized as AppMode) ? (normalized as AppMode) : null;
};

const toUrl = (location: LocationLike): URL => {
  if (location instanceof URL) {
    return location;
  }
  if (typeof location === "string") {
    return new URL(location, "http://localhost");
  }
  return new URL(location.href);
};

export const resolveAppMode = (location: LocationLike, env?: EnvLike): AppMode => {
  const url = toUrl(location);
  const queryMode = toAppMode(url.searchParams.get("mode"));
  if (queryMode) {
    return queryMode;
  }
  const envMode = toAppMode(env?.APP_MODE_TARGET);
  if (envMode) {
    return envMode;
  }
  return "sandbox";
};
