export type UiShellMode = "v1" | "v2";

type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

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
  if (queryMode === "v1") {
    return "v1";
  }
  if (queryMode === "v2shell") {
    return "v2";
  }
  const envFlag = toBooleanFlag(env?.USE_NEW_UI_SHELL);
  if (envFlag === true) {
    return "v2";
  }
  if (envFlag === false) {
    return "v1";
  }
  return "v2";
};
