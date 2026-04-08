export type BoundaryLabelZeroPolicy = "empty" | "zero";

export const normalizePlotRadix = (radix: number): number => Math.max(2, Math.trunc(radix));

export const resolveTierMagnitude = (value: number, radix: number): number => {
  const safeRadix = normalizePlotRadix(radix);
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs < 1) {
    return safeRadix - 1;
  }
  const digits = Math.floor(Math.log(abs) / Math.log(safeRadix)) + 1;
  const tier = Math.pow(safeRadix, Math.max(1, digits)) - 1;
  return Number.isFinite(tier) ? tier : Number.MAX_VALUE;
};

export const resolveSymmetricTierRange = (maxAbsComponent: number, radix: number): number =>
  resolveTierMagnitude(maxAbsComponent, radix);

export const resolveAsymmetricTierDomain = (
  values: readonly number[],
  radix: number,
): { min: number; max: number } => {
  const safeRadix = normalizePlotRadix(radix);
  let maxPositiveRounded = 0;
  let minNegativeRounded = 0;
  let hasPositive = false;
  let hasNegative = false;
  let hasZero = false;

  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value > 0) {
      const rounded = Math.ceil(value);
      maxPositiveRounded = hasPositive ? Math.max(maxPositiveRounded, rounded) : rounded;
      hasPositive = true;
      continue;
    }
    if (value < 0) {
      const rounded = Math.floor(value);
      minNegativeRounded = hasNegative ? Math.min(minNegativeRounded, rounded) : rounded;
      hasNegative = true;
      continue;
    }
    hasZero = true;
  }

  const min = hasNegative ? -resolveTierMagnitude(minNegativeRounded, safeRadix) : 0;
  let max = 0;
  if (hasPositive) {
    max = resolveTierMagnitude(maxPositiveRounded, safeRadix);
  } else if (hasZero) {
    max = safeRadix - 1;
  }

  return { min, max };
};

export const formatBoundaryLabel = (
  value: number,
  options: {
    appendImaginaryUnit?: boolean;
    zeroPolicy?: BoundaryLabelZeroPolicy;
  } = {},
): string => {
  const zeroPolicy = options.zeroPolicy ?? "empty";
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) {
    return zeroPolicy === "zero" ? "0" : "";
  }
  const base = Math.trunc(value).toString();
  return options.appendImaginaryUnit ? `${base}\u00d7i` : base;
};

export const NUMBER_LINE_REAL_LABEL_FIT = {
  minLength: 6,
  maxWidthUnits: 16,
} as const;
