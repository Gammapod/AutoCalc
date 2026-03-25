type LocationLike = { href: string; pathname: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;

export type AppShellTarget = "mobile_web_itch" | "unknown";

const VALID_TARGETS = new Set<AppShellTarget>(["mobile_web_itch", "unknown"]);

const toAppShellTarget = (value: unknown): AppShellTarget | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return VALID_TARGETS.has(normalized as AppShellTarget) ? (normalized as AppShellTarget) : null;
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

export const resolveAppShellTarget = (location: LocationLike, env?: EnvLike): AppShellTarget => {
  const envTarget = toAppShellTarget(env?.APP_SHELL_TARGET);
  if (envTarget) {
    return envTarget;
  }
  const url = toUrl(location);
  const queryTarget = toAppShellTarget(url.searchParams.get("shell_target"));
  if (queryTarget) {
    return queryTarget;
  }
  const path = (url.pathname || "").toLowerCase();
  if (path.includes("/mobile_web/")) {
    return "mobile_web_itch";
  }
  return "unknown";
};
