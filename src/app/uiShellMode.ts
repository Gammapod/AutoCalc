export type UiShellMode = "legacy" | "mobile" | "desktop";

type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

const VALID_TARGETS = new Set<UiShellMode>(["legacy", "mobile", "desktop"]);

const toBooleanFlag = (value: unknown): boolean | null => {
  if (value === true || value === false) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return null;
};

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
  const queryMode = url.searchParams.get("ui");
  if (queryMode === "legacy" || queryMode === "v1") {
    return "legacy";
  }
  if (queryMode === "mobile" || queryMode === "v2shell") {
    return "mobile";
  }
  if (queryMode === "desktop") {
    return "desktop";
  }

  const envTarget = toShellTarget(env?.UI_SHELL_TARGET);
  if (envTarget) {
    return envTarget;
  }

  const envFlag = toBooleanFlag(env?.USE_NEW_UI_SHELL);
  if (envFlag === true) {
    return "mobile";
  }
  if (envFlag === false) {
    return "legacy";
  }
  return "mobile";
};
