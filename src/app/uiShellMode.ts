export type UiShellMode = "mobile" | "desktop";

type LocationLike = { href: string } | URL | string;
type EnvLike = Record<string, unknown> | undefined;
type RuntimeNavigatorLike = {
  userAgent?: string;
  maxTouchPoints?: number;
};
type RuntimeLike = {
  navigator?: RuntimeNavigatorLike;
  innerWidth?: number;
  matchMedia?: (query: string) => { matches: boolean };
};

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

const detectRuntimeUiShellMode = (runtime: RuntimeLike | undefined): UiShellMode | null => {
  if (!runtime) {
    return null;
  }

  const userAgent = runtime.navigator?.userAgent?.toLowerCase() ?? "";
  const isMobileUserAgent = /android|iphone|ipad|ipod|mobile|blackberry|opera mini|iemobile|webos/.test(userAgent);
  if (isMobileUserAgent) {
    return "mobile";
  }

  const width = runtime.innerWidth;
  const hasNarrowViewport = typeof width === "number" ? width <= 900 : null;

  let prefersCoarsePointer: boolean | null = null;
  if (typeof runtime.matchMedia === "function") {
    try {
      prefersCoarsePointer = runtime.matchMedia("(pointer: coarse)").matches;
    } catch {
      prefersCoarsePointer = null;
    }
  }

  const maxTouchPoints = runtime.navigator?.maxTouchPoints;
  const hasTouch = typeof maxTouchPoints === "number" ? maxTouchPoints > 0 : null;

  if ((prefersCoarsePointer === true || hasTouch === true) && hasNarrowViewport !== false) {
    return "mobile";
  }
  if (hasNarrowViewport === false && prefersCoarsePointer !== true) {
    return "desktop";
  }
  return null;
};

export const resolveUiShellMode = (location: LocationLike, env?: EnvLike, runtime?: RuntimeLike): UiShellMode => {
  const url = toUrl(location);
  const queryTarget = toShellTarget(url.searchParams.get("ui"));
  if (queryTarget) {
    return queryTarget;
  }

  const envTarget = toShellTarget(env?.UI_SHELL_TARGET);
  if (envTarget) {
    return envTarget;
  }

  const runtimeTarget = detectRuntimeUiShellMode(
    runtime ?? (globalThis as RuntimeLike),
  );
  if (runtimeTarget) {
    return runtimeTarget;
  }
  return "mobile";
};
