export type UiShellMode = "mobile" | "desktop";

type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

const VALID_TARGETS = new Set<UiShellMode>(["mobile", "desktop"]);

const toShellTarget = (value: unknown): UiShellMode | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_TARGETS.has(normalized as UiShellMode) ? (normalized as UiShellMode) : null;
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

export const resolveUiShellMode = (location: LocationLike, env?: EnvLike): UiShellMode => {
  const url = toUrl(location);
  const queryTarget = toShellTarget(url.searchParams.get("ui"));
  if (queryTarget) {
    return queryTarget;
  }

  const envTarget = toShellTarget(env?.UI_SHELL_TARGET);
  if (envTarget) {
    return envTarget;
  }
  return "mobile";
};
