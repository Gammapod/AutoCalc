import type { AllocatorState, ControlField, ControlProfile, LambdaControl, RationalValue } from "./types.js";

const CONTROL_FIELDS: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];

const HARD_BOUNDS: Record<ControlField, { min: number; max: number }> = {
  alpha: { min: 1, max: 12 },
  beta: { min: 1, max: 12 },
  gamma: { min: 0, max: 12 },
  delta: { min: 1, max: 24 },
  epsilon: { min: 0, max: 200 },
};

const clampInt = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.trunc(value)));
};

const clampField = (field: ControlField, raw: number): number => {
  const bounds = HARD_BOUNDS[field];
  return clampInt(raw, bounds.min, bounds.max);
};

const resolveProfileStarts = (profile?: ControlProfile): Record<ControlField, number> => ({
  alpha: profile?.starts.alpha ?? HARD_BOUNDS.alpha.min,
  beta: profile?.starts.beta ?? HARD_BOUNDS.beta.min,
  gamma: profile?.starts.gamma ?? HARD_BOUNDS.gamma.min,
  delta: profile?.starts.delta ?? HARD_BOUNDS.delta.min,
  epsilon: profile?.starts.epsilon ?? HARD_BOUNDS.epsilon.min,
});

export type LambdaDerivedValues = {
  deltaDerived: number;
  deltaEffective: number;
  epsilonDerived: RationalValue;
  epsilonEffective: RationalValue;
  spentPoints: number;
  unusedPoints: number;
  effectiveFields: Record<ControlField, number>;
};

const sanitizeFields = (input: Partial<Record<ControlField, number>>, profile?: ControlProfile): Record<ControlField, number> => {
  const starts = resolveProfileStarts(profile);
  return {
    alpha: clampField("alpha", input.alpha ?? starts.alpha),
    beta: clampField("beta", input.beta ?? starts.beta),
    gamma: clampField("gamma", input.gamma ?? starts.gamma),
    delta: clampField("delta", input.delta ?? starts.delta),
    epsilon: clampField("epsilon", input.epsilon ?? starts.epsilon),
  };
};

export const evaluateEffectiveFields = (control: LambdaControl, _profile?: ControlProfile): Record<ControlField, number> =>
  sanitizeFields(control);

export const createDefaultLambdaControl = (profile?: ControlProfile): LambdaControl => {
  const fields = sanitizeFields({}, profile);
  return {
    alpha: fields.alpha,
    beta: fields.beta,
    gamma: fields.gamma,
    delta: fields.delta,
    epsilon: fields.epsilon,
  };
};

export const getLambdaDerivedValues = (control: LambdaControl, profile?: ControlProfile): LambdaDerivedValues => {
  const effective = sanitizeFields(control, profile);
  return {
    deltaDerived: effective.delta,
    deltaEffective: effective.delta,
    epsilonDerived: { num: BigInt(effective.epsilon), den: 1n },
    epsilonEffective: { num: BigInt(effective.epsilon), den: 1n },
    spentPoints: 0,
    unusedPoints: 0,
    effectiveFields: effective,
  };
};

export const getLambdaSpentPoints = (_control: LambdaControl, _profile?: ControlProfile): number => 0;
export const getLambdaUnusedPoints = (_control: LambdaControl, _profile?: ControlProfile): number => 0;

export const sanitizeLambdaControl = (input: LambdaControl | null | undefined, profile?: ControlProfile): LambdaControl => {
  if (!input) {
    return createDefaultLambdaControl(profile);
  }
  const fields = sanitizeFields(input, profile);
  return {
    alpha: fields.alpha,
    beta: fields.beta,
    gamma: fields.gamma,
    delta: fields.delta,
    epsilon: fields.epsilon,
  };
};

export const getAutoEqualsRateMultiplier = (control: LambdaControl, profile?: ControlProfile): number => {
  const epsilon = Math.max(0, getLambdaDerivedValues(control, profile).effectiveFields.epsilon);
  return Math.pow(1.05, epsilon);
};

export const buildAllocatorSnapshot = (control: LambdaControl, profile?: ControlProfile): AllocatorState => {
  const effective = getLambdaDerivedValues(control, profile).effectiveFields;
  return {
    maxPoints: 0,
    allocations: {
      width: effective.alpha,
      height: effective.beta,
      range: effective.delta,
      speed: effective.epsilon,
      slots: effective.gamma,
    },
  };
};
