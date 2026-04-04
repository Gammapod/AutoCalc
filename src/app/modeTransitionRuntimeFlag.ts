type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

const ENABLED_TOKENS = new Set(["1", "true", "on", "yes"]);

const toUrl = (location: LocationLike): URL => {
  if (location instanceof URL) {
    return location;
  }
  if (typeof location === "string") {
    return new URL(location, "http://localhost");
  }
  return new URL(location.href);
};

const parseEnabledToken = (value: unknown): boolean | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return ENABLED_TOKENS.has(normalized);
};

export const resolveModeTransitionRuntimeEnabled = (location: LocationLike, env?: EnvLike): boolean => {
  const url = toUrl(location);
  const queryValue = parseEnabledToken(url.searchParams.get("mode_transition_runtime"));
  if (queryValue !== null) {
    return queryValue;
  }
  const envValue = parseEnabledToken(env?.MODE_TRANSITION_RUNTIME);
  if (envValue !== null) {
    return envValue;
  }
  return false;
};

