import { KEYPAD_DIM_MAX, KEYPAD_DIM_MIN, OPERATION_SLOTS_MAX, OPERATION_SLOTS_MIN, TOTAL_DIGITS_MAX, TOTAL_DIGITS_MIN } from "./state.js";
import type { AllocatorState, LambdaAxis, LambdaControl, RationalValue } from "./types.js";

const EPSILON_BASE_DEN = 10n;
const EPSILON_RATE_BASE = 1.05;
const TRIM_ORDER: readonly LambdaAxis[] = ["gamma", "beta", "alpha"];

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

const normalizeRational = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    return { num: 0n, den: 1n };
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  const num = value.num * sign;
  const den = value.den * sign;
  const divisor = gcd(num, den);
  return {
    num: num / divisor,
    den: den / divisor,
  };
};

const clampInteger = (value: number, min: number, max: number): number => {
  if (!Number.isInteger(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

const clampNonNegativeInt = (value: number): number => {
  if (!Number.isInteger(value)) {
    return 0;
  }
  return Math.max(0, value);
};

export const clampAlpha = (value: number): number => clampInteger(value, KEYPAD_DIM_MIN - 1, KEYPAD_DIM_MAX - 1);
export const clampBeta = (value: number): number => clampInteger(value, KEYPAD_DIM_MIN - 1, KEYPAD_DIM_MAX - 1);
export const clampGamma = (value: number): number => clampInteger(value, OPERATION_SLOTS_MIN, OPERATION_SLOTS_MAX);

export const createDefaultLambdaControl = (): LambdaControl => ({
  maxPoints: 0,
  alpha: 0,
  beta: 0,
  gamma: 0,
  overrides: {},
});

export const getLambdaSpentPoints = (control: LambdaControl): number => control.alpha + control.beta + control.gamma;

export const getLambdaUnusedPoints = (control: LambdaControl): number => control.maxPoints - getLambdaSpentPoints(control);

export const deriveDelta = (control: Pick<LambdaControl, "alpha" | "beta" | "gamma">): number =>
  control.gamma + Math.floor(control.alpha / 2) + Math.floor(control.beta / 2);

export const deriveEpsilon = (
  control: Pick<LambdaControl, "alpha" | "beta" | "gamma">,
  deltaEffective: number,
): RationalValue => normalizeRational({
  num: BigInt(control.alpha + control.beta + control.gamma + deltaEffective),
  den: EPSILON_BASE_DEN,
});

export const toNumber = (value: RationalValue): number =>
  Number(value.num) / Number(value.den);

export type LambdaDerivedValues = {
  deltaDerived: number;
  deltaEffective: number;
  epsilonDerived: RationalValue;
  epsilonEffective: RationalValue;
  spentPoints: number;
  unusedPoints: number;
};

export const getLambdaDerivedValues = (control: LambdaControl): LambdaDerivedValues => {
  const deltaDerived = deriveDelta(control);
  const deltaOverride = control.overrides.delta;
  const deltaEffective = deltaOverride === undefined ? deltaDerived : clampNonNegativeInt(deltaOverride);
  const epsilonDerived = deriveEpsilon(control, deltaEffective);
  const epsilonEffective = control.overrides.epsilon ? normalizeRational(control.overrides.epsilon) : epsilonDerived;
  const spentPoints = getLambdaSpentPoints(control);
  const unusedPoints = control.maxPoints - spentPoints;
  return {
    deltaDerived,
    deltaEffective,
    epsilonDerived,
    epsilonEffective,
    spentPoints,
    unusedPoints,
  };
};

export const sanitizeLambdaControl = (input: LambdaControl | null | undefined): LambdaControl => {
  if (!input) {
    return createDefaultLambdaControl();
  }
  const sanitized: LambdaControl = {
    maxPoints: clampNonNegativeInt(input.maxPoints),
    alpha: clampAlpha(input.alpha),
    beta: clampBeta(input.beta),
    gamma: clampGamma(input.gamma),
    overrides: {},
  };
  if (input.overrides && input.overrides.delta !== undefined) {
    sanitized.overrides.delta = clampNonNegativeInt(input.overrides.delta);
  }
  if (input.overrides && input.overrides.epsilon) {
    sanitized.overrides.epsilon = normalizeRational(input.overrides.epsilon);
  }
  return trimLambdaToBudget(sanitized);
};

export const withLegacyAllocatorFallback = (
  control: LambdaControl,
  allocator: AllocatorState,
): LambdaControl => sanitizeLambdaControl({
  ...control,
  maxPoints: Math.max(control.maxPoints, allocator.maxPoints),
  alpha: Math.max(control.alpha, allocator.allocations.width),
  beta: Math.max(control.beta, allocator.allocations.height),
  gamma: Math.max(control.gamma, allocator.allocations.slots),
});

export const canAdjustAxis = (control: LambdaControl, axis: LambdaAxis, delta: 1 | -1): boolean => {
  if (delta === 1 && getLambdaUnusedPoints(control) <= 0) {
    return false;
  }
  const current = control[axis];
  if (delta === -1 && current <= 0) {
    return false;
  }
  const next = current + delta;
  if (axis === "alpha") {
    return next >= KEYPAD_DIM_MIN - 1 && next <= KEYPAD_DIM_MAX - 1;
  }
  if (axis === "beta") {
    return next >= KEYPAD_DIM_MIN - 1 && next <= KEYPAD_DIM_MAX - 1;
  }
  return next >= OPERATION_SLOTS_MIN && next <= OPERATION_SLOTS_MAX;
};

export const adjustAxis = (control: LambdaControl, axis: LambdaAxis, delta: 1 | -1): LambdaControl => {
  if (!canAdjustAxis(control, axis, delta)) {
    return control;
  }
  const next = {
    ...control,
    [axis]: control[axis] + delta,
  };
  return sanitizeLambdaControl(next);
};

export const trimLambdaToBudget = (control: LambdaControl): LambdaControl => {
  const next = { ...control };
  let overspend = getLambdaSpentPoints(next) - next.maxPoints;
  if (overspend <= 0) {
    return next;
  }
  for (const axis of TRIM_ORDER) {
    if (overspend <= 0) {
      break;
    }
    const reduction = Math.min(next[axis], overspend);
    next[axis] -= reduction;
    overspend -= reduction;
  }
  return next;
};

export const withMaxPointsSet = (control: LambdaControl, rawValue: number): LambdaControl => {
  const maxPoints = clampNonNegativeInt(rawValue);
  return trimLambdaToBudget({
    ...control,
    maxPoints,
  });
};

export const withMaxPointsAdded = (control: LambdaControl, amount: number): LambdaControl => {
  const delta = clampNonNegativeInt(amount);
  if (delta <= 0) {
    return control;
  }
  return {
    ...control,
    maxPoints: control.maxPoints + delta,
  };
};

export const resetLambdaAdjustments = (control: LambdaControl): LambdaControl => ({
  ...control,
  alpha: 0,
  beta: 0,
  gamma: 0,
  overrides: {},
});

export const getEffectiveKeypadColumns = (control: LambdaControl): number =>
  clampInteger(1 + control.alpha, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);

export const getEffectiveKeypadRows = (control: LambdaControl): number =>
  clampInteger(1 + control.beta, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);

export const getEffectiveMaxSlots = (control: LambdaControl): number =>
  clampInteger(control.gamma, OPERATION_SLOTS_MIN, OPERATION_SLOTS_MAX);

export const getEffectiveMaxTotalDigits = (control: LambdaControl): number =>
  clampInteger(1 + getLambdaDerivedValues(control).deltaEffective, TOTAL_DIGITS_MIN, TOTAL_DIGITS_MAX);

export const getAutoEqualsRateMultiplier = (control: LambdaControl): number => {
  const epsilon = Math.max(0, toNumber(getLambdaDerivedValues(control).epsilonEffective));
  return Math.pow(EPSILON_RATE_BASE, epsilon);
};

export const buildAllocatorSnapshot = (control: LambdaControl): AllocatorState => {
  const derived = getLambdaDerivedValues(control);
  return {
    maxPoints: control.maxPoints,
    allocations: {
      width: control.alpha,
      height: control.beta,
      range: derived.deltaEffective,
      speed: Math.max(0, Math.trunc(toNumber(derived.epsilonEffective))),
      slots: control.gamma,
    },
  };
};
