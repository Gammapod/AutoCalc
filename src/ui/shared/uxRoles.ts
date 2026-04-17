export type UxRole =
  | "error"
  | "imaginary"
  | "unlock"
  | "analysis"
  | "help"
  | "base_setting"
  | "visualizer_setting"
  | "wrap_setting"
  | "default";

export type UxRoleState = "normal" | "muted" | "active" | "placeholder";

export type UxRoleTokenName =
  | "--ux-role-error-color"
  | "--ux-role-imaginary-color"
  | "--ux-role-unlock-color"
  | "--ux-role-analysis-color"
  | "--ux-role-help-color"
  | "--ux-role-base-setting-color"
  | "--ux-role-visualizer-setting-color"
  | "--ux-role-wrap-setting-color"
  | "--ux-role-default-color";

export const UX_ROLE_TOKEN_BY_ROLE: Record<UxRole, UxRoleTokenName> = {
  error: "--ux-role-error-color",
  imaginary: "--ux-role-imaginary-color",
  unlock: "--ux-role-unlock-color",
  analysis: "--ux-role-analysis-color",
  help: "--ux-role-help-color",
  base_setting: "--ux-role-base-setting-color",
  visualizer_setting: "--ux-role-visualizer-setting-color",
  wrap_setting: "--ux-role-wrap-setting-color",
  default: "--ux-role-default-color",
};

export type UxRoleAssignment = {
  uxRole: UxRole;
  uxState?: UxRoleState;
  uxRoleOverride?: UxRole;
  overrideReason?: string;
};

export type ResolvedUxRoleAssignment = {
  uxRole: UxRole;
  uxState: UxRoleState;
  uxToken: UxRoleTokenName;
};

export type UxRoleOverrideRegistryEntry = {
  id: string;
  scope: string;
  reason: string;
};

export const UX_ROLE_OVERRIDE_REGISTRY: readonly UxRoleOverrideRegistryEntry[] = [];

const UX_ROLE_FALLBACK_HEX: Record<UxRole, `#${string}`> = {
  error: "#ff5c5c",
  imaginary: "#be8ee8",
  unlock: "#79c3ff",
  analysis: "#f2cf57",
  help: "#e9f4ff",
  base_setting: "#c996f0",
  visualizer_setting: "#79c3ff",
  wrap_setting: "#63c26b",
  default: "#b4f1d3",
};

const toHexChannel = (value: number): string => value.toString(16).padStart(2, "0");

const applyAlphaToHex = (hex: `#${string}`, alpha01: number): string => {
  const normalized = hex.replace("#", "");
  const body = normalized.length === 3
    ? normalized.split("").map((channel) => `${channel}${channel}`).join("")
    : normalized;
  if (body.length !== 6) {
    return hex;
  }
  const alpha = Math.max(0, Math.min(1, alpha01));
  const alphaByte = Math.round(alpha * 255);
  return `#${body}${toHexChannel(alphaByte)}`;
};

export const resolveUxRoleAssignment = (assignment: UxRoleAssignment): ResolvedUxRoleAssignment => {
  if (assignment.uxRoleOverride && !assignment.overrideReason) {
    throw new Error("uxRoleOverride requires overrideReason");
  }
  const effectiveRole = assignment.uxRoleOverride ?? assignment.uxRole;
  const uxState = assignment.uxState ?? "normal";
  return {
    uxRole: effectiveRole,
    uxState,
    uxToken: UX_ROLE_TOKEN_BY_ROLE[effectiveRole],
  };
};

export const applyUxRoleAttributes = (target: HTMLElement | SVGElement, assignment: UxRoleAssignment): void => {
  const resolved = resolveUxRoleAssignment(assignment);
  target.setAttribute("data-ux-role", resolved.uxRole);
  target.setAttribute("data-ux-state", resolved.uxState);
  target.setAttribute("data-ux-token", resolved.uxToken);
  if (assignment.uxRoleOverride) {
    target.setAttribute("data-ux-role-overridden", "true");
  }
};

export const resolveUxRoleColor = (
  role: UxRole,
  options: {
    document?: Document | null;
    alpha01?: number;
  } = {},
): string => {
  const token = UX_ROLE_TOKEN_BY_ROLE[role];
  const fallback = UX_ROLE_FALLBACK_HEX[role];
  const alpha = options.alpha01;
  if (!options.document || typeof getComputedStyle === "undefined") {
    return typeof alpha === "number" ? applyAlphaToHex(fallback, alpha) : fallback;
  }
  const rootStyles = getComputedStyle(options.document.documentElement);
  const computed = rootStyles.getPropertyValue(token).trim();
  const resolved = computed.length > 0 ? computed : fallback;
  if (typeof alpha !== "number") {
    return resolved;
  }
  if (!resolved.startsWith("#")) {
    return resolved;
  }
  return applyAlphaToHex(resolved as `#${string}`, alpha);
};
