import type { AllocatorState, ControlField, ControlProfile, LambdaAxis, LambdaControl, RationalValue } from "./types.js";

const CONTROL_FIELDS: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];
const SPEND_AXES: readonly LambdaAxis[] = ["alpha", "beta", "gamma"];
const TRIM_ORDER: readonly LambdaAxis[] = ["gamma", "beta", "alpha"];

const clampInteger = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

const clampNonNegativeInt = (value: number): number =>
  !Number.isFinite(value) ? 0 : Math.max(0, Math.trunc(value));

const floorValue = (value: number): number => Math.floor(value);

const defaultProfile: ControlProfile = {
  id: "f",
  starts: { alpha: 1, beta: 1, gamma: 0, delta: 1, epsilon: 0 },
  settable: { alpha: true, beta: true, gamma: true, delta: false, epsilon: false },
  bounds: {
    alpha: { min: 1, max: 8 },
    beta: { min: 1, max: 8 },
    gamma: { min: 0, max: 4 },
    delta: { min: 1, max: null },
    epsilon: { min: 0, max: null },
  },
  equations: {
    alpha: { coefficients: { alpha: 1, beta: 0, gamma: 0, delta: 0, epsilon: 0 }, constant: 0 },
    beta: { coefficients: { alpha: 0, beta: 1, gamma: 0, delta: 0, epsilon: 0 }, constant: 0 },
    gamma: { coefficients: { alpha: 0, beta: 0, gamma: 1, delta: 0, epsilon: 0 }, constant: 0 },
    delta: { coefficients: { alpha: 0.5, beta: 0.5, gamma: 1, delta: 0, epsilon: 0 }, constant: 0 },
    epsilon: { coefficients: { alpha: 0.1, beta: 0.1, gamma: 0.1, delta: 0.1, epsilon: 0 }, constant: 0.1 },
  },
  rounding: "floor",
  gammaMinAfterOne: true,
};

const resolveProfile = (profile?: ControlProfile): ControlProfile => profile ?? defaultProfile;

const minForField = (profile: ControlProfile, field: ControlField, control: LambdaControl): number => {
  if (field === "gamma" && profile.gammaMinAfterOne && control.gammaMinRaised) {
    return Math.max(1, profile.bounds.gamma.min);
  }
  return profile.bounds[field].min;
};

const clampToFieldBounds = (value: number, field: ControlField, control: LambdaControl, profile: ControlProfile): number => {
  const min = minForField(profile, field, control);
  const max = profile.bounds[field].max;
  const floored = floorValue(value);
  if (max === null) {
    return Math.max(min, floored);
  }
  return clampInteger(floored, min, max);
};

export type LambdaDerivedValues = {
  deltaDerived: number;
  deltaEffective: number;
  epsilonDerived: RationalValue;
  epsilonEffective: RationalValue;
  spentPoints: number;
  unusedPoints: number;
  effectiveFields: Record<ControlField, number>;
};

const evaluateEffectiveFieldsInternal = (control: LambdaControl, profileInput?: ControlProfile): Record<ControlField, number> => {
  const profile = resolveProfile(profileInput);
  const effective: Record<ControlField, number> = {
    alpha: profile.starts.alpha,
    beta: profile.starts.beta,
    gamma: profile.starts.gamma,
    delta: profile.starts.delta,
    epsilon: profile.starts.epsilon,
  };

  for (const field of CONTROL_FIELDS) {
    if (profile.settable[field]) {
      const value = field === "alpha"
        ? control.alpha
        : field === "beta"
          ? control.beta
          : field === "gamma"
            ? control.gamma
            : profile.starts[field];
      effective[field] = clampToFieldBounds(value, field, control, profile);
      continue;
    }
    const eq = profile.equations[field];
    const raw =
      effective.alpha * eq.coefficients.alpha
      + effective.beta * eq.coefficients.beta
      + effective.gamma * eq.coefficients.gamma
      + effective.delta * eq.coefficients.delta
      + effective.epsilon * eq.coefficients.epsilon
      + eq.constant;
    effective[field] = clampToFieldBounds(raw, field, control, profile);
  }

  return effective;
};

export const evaluateEffectiveFields = (control: LambdaControl, profile?: ControlProfile): Record<ControlField, number> =>
  evaluateEffectiveFieldsInternal(control, profile);

const getSpentFromEffective = (effective: Record<ControlField, number>, profileInput?: ControlProfile): number => {
  const profile = resolveProfile(profileInput);
  let spent = 0;
  for (const axis of SPEND_AXES) {
    if (!profile.settable[axis]) {
      continue;
    }
    spent += effective[axis];
  }
  return spent;
};

export const createDefaultLambdaControl = (profileInput?: ControlProfile): LambdaControl => {
  const profile = resolveProfile(profileInput);
  const base: LambdaControl = {
    maxPoints: 0,
    alpha: profile.starts.alpha,
    beta: profile.starts.beta,
    gamma: profile.starts.gamma,
    gammaMinRaised: profile.gammaMinAfterOne ? profile.starts.gamma >= 1 : false,
  };
  const effective = evaluateEffectiveFieldsInternal(base, profile);
  return {
    ...base,
    alpha: effective.alpha,
    beta: effective.beta,
    gamma: effective.gamma,
    maxPoints: getSpentFromEffective(effective, profile),
  };
};

export const getLambdaDerivedValues = (control: LambdaControl, profileInput?: ControlProfile): LambdaDerivedValues => {
  const profile = resolveProfile(profileInput);
  const effective = evaluateEffectiveFieldsInternal(control, profile);
  const spentPoints = getSpentFromEffective(effective, profile);
  const unusedPoints = control.maxPoints - spentPoints;
  return {
    deltaDerived: effective.delta,
    deltaEffective: effective.delta,
    epsilonDerived: { num: BigInt(effective.epsilon), den: 1n },
    epsilonEffective: { num: BigInt(effective.epsilon), den: 1n },
    spentPoints,
    unusedPoints,
    effectiveFields: effective,
  };
};

export const getLambdaSpentPoints = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).spentPoints;

export const getLambdaUnusedPoints = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).unusedPoints;

export const sanitizeLambdaControl = (input: LambdaControl | null | undefined, profileInput?: ControlProfile): LambdaControl => {
  const profile = resolveProfile(profileInput);
  if (!input) {
    return createDefaultLambdaControl(profile);
  }
  const next: LambdaControl = {
    maxPoints: clampNonNegativeInt(input.maxPoints),
    alpha: Math.trunc(input.alpha),
    beta: Math.trunc(input.beta),
    gamma: Math.trunc(input.gamma),
    gammaMinRaised: Boolean(input.gammaMinRaised),
  };
  if (profile.gammaMinAfterOne && next.gamma >= 1) {
    next.gammaMinRaised = true;
  }

  // Clamp settable axes against profile limits.
  for (const axis of SPEND_AXES) {
    if (!profile.settable[axis]) {
      const startValue = profile.starts[axis];
      if (axis === "alpha") {
        next.alpha = startValue;
      } else if (axis === "beta") {
        next.beta = startValue;
      } else {
        next.gamma = startValue;
      }
      continue;
    }
    const clamped = clampToFieldBounds(axis === "alpha" ? next.alpha : axis === "beta" ? next.beta : next.gamma, axis, next, profile);
    if (axis === "alpha") {
      next.alpha = clamped;
    } else if (axis === "beta") {
      next.beta = clamped;
    } else {
      next.gamma = clamped;
    }
  }

  // Trim to budget by reducing settable axes according to policy.
  let derived = getLambdaDerivedValues(next, profile);
  if (derived.spentPoints <= next.maxPoints) {
    return next;
  }
  let overspend = derived.spentPoints - next.maxPoints;
  for (const axis of TRIM_ORDER) {
    if (overspend <= 0 || !profile.settable[axis]) {
      continue;
    }
    while (overspend > 0) {
      const current = axis === "alpha" ? next.alpha : axis === "beta" ? next.beta : next.gamma;
      const min = minForField(profile, axis, next);
      if (current <= min) {
        break;
      }
      if (axis === "alpha") {
        next.alpha -= 1;
      } else if (axis === "beta") {
        next.beta -= 1;
      } else {
        next.gamma -= 1;
      }
      overspend -= 1;
    }
  }
  derived = getLambdaDerivedValues(next, profile);
  if (derived.spentPoints > next.maxPoints) {
    next.maxPoints = derived.spentPoints;
  }
  return next;
};

export const canAdjustAxis = (control: LambdaControl, profileInput: ControlProfile | undefined, axis: LambdaAxis, delta: 1 | -1): boolean => {
  const profile = resolveProfile(profileInput);
  if (!profile.settable[axis]) {
    return false;
  }
  const derived = getLambdaDerivedValues(control, profile);
  if (delta === 1 && derived.unusedPoints <= 0) {
    return false;
  }
  const current = axis === "alpha" ? control.alpha : axis === "beta" ? control.beta : control.gamma;
  const next = current + delta;
  const min = minForField(profile, axis, control);
  const max = profile.bounds[axis].max;
  if (next < min) {
    return false;
  }
  if (max !== null && next > max) {
    return false;
  }
  return true;
};

export const adjustAxis = (control: LambdaControl, profileInput: ControlProfile | undefined, axis: LambdaAxis, delta: 1 | -1): LambdaControl => {
  const profile = resolveProfile(profileInput);
  if (!canAdjustAxis(control, profile, axis, delta)) {
    return control;
  }
  const next: LambdaControl = {
    ...control,
    [axis]: (axis === "alpha" ? control.alpha : axis === "beta" ? control.beta : control.gamma) + delta,
  };
  if (profile.gammaMinAfterOne && axis === "gamma" && next.gamma >= 1) {
    next.gammaMinRaised = true;
  }
  return sanitizeLambdaControl(next, profile);
};

export const withMaxPointsSet = (control: LambdaControl, profileInput: ControlProfile | undefined, rawValue: number): LambdaControl =>
  sanitizeLambdaControl({ ...control, maxPoints: clampNonNegativeInt(rawValue) }, profileInput);

export const withMaxPointsAdded = (control: LambdaControl, profileInput: ControlProfile | undefined, amount: number): LambdaControl => {
  const delta = clampNonNegativeInt(amount);
  if (delta <= 0) {
    return control;
  }
  return sanitizeLambdaControl({ ...control, maxPoints: control.maxPoints + delta }, profileInput);
};

export const resetLambdaAdjustments = (control: LambdaControl, profileInput?: ControlProfile): LambdaControl => {
  const profile = resolveProfile(profileInput);
  const next: LambdaControl = {
    ...control,
    alpha: profile.starts.alpha,
    beta: profile.starts.beta,
    gamma: profile.starts.gamma,
    gammaMinRaised: profile.gammaMinAfterOne ? profile.starts.gamma >= 1 : false,
  };
  return sanitizeLambdaControl(next, profile);
};

export const getEffectiveKeypadColumns = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).effectiveFields.alpha;

export const getEffectiveKeypadRows = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).effectiveFields.beta;

export const getEffectiveMaxSlots = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).effectiveFields.gamma;

export const getEffectiveMaxTotalDigits = (control: LambdaControl, profile?: ControlProfile): number =>
  getLambdaDerivedValues(control, profile).effectiveFields.delta;

export const getAutoEqualsRateMultiplier = (control: LambdaControl, profile?: ControlProfile): number => {
  const epsilon = Math.max(0, getLambdaDerivedValues(control, profile).effectiveFields.epsilon);
  return Math.pow(1.05, epsilon);
};

export const buildAllocatorSnapshot = (control: LambdaControl, profile?: ControlProfile): AllocatorState => {
  const derived = getLambdaDerivedValues(control, profile);
  const effective = derived.effectiveFields;
  return {
    maxPoints: control.maxPoints,
    allocations: {
      width: effective.alpha,
      height: effective.beta,
      range: effective.delta,
      speed: effective.epsilon,
      slots: effective.gamma,
    },
  };
};
