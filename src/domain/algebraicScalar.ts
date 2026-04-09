import type { AlgebraicBasis, AlgebraicValue, RationalValue } from "./types.js";

const BASIS_ORDER: AlgebraicBasis[] = ["one", "sqrt2", "sqrt3", "sqrt6"];

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

export const normalizeRational = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    throw new Error("Invalid rational denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  const num = value.num * sign;
  const den = value.den * sign;
  let a = absBigInt(num);
  let b = absBigInt(den);
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return { num: num / a, den: den / a };
};

const addRational = (left: RationalValue, right: RationalValue): RationalValue =>
  normalizeRational({
    num: left.num * right.den + right.num * left.den,
    den: left.den * right.den,
  });

const mulRational = (left: RationalValue, right: RationalValue): RationalValue =>
  normalizeRational({
    num: left.num * right.num,
    den: left.den * right.den,
  });

const negRational = (value: RationalValue): RationalValue => ({ num: -value.num, den: value.den });

export const isRationalZero = (value: RationalValue): boolean => normalizeRational(value).num === 0n;

const addCoeff = (
  target: Partial<Record<AlgebraicBasis, RationalValue>>,
  basis: AlgebraicBasis,
  coefficient: RationalValue,
): void => {
  if (isRationalZero(coefficient)) {
    return;
  }
  const existing = target[basis];
  const next = existing ? addRational(existing, coefficient) : normalizeRational(coefficient);
  if (isRationalZero(next)) {
    delete target[basis];
    return;
  }
  target[basis] = next;
};

export const normalizeAlgebraicValue = (value: AlgebraicValue): AlgebraicValue => {
  const out: Partial<Record<AlgebraicBasis, RationalValue>> = {};
  for (const basis of BASIS_ORDER) {
    const coeff = value[basis];
    if (!coeff) {
      continue;
    }
    addCoeff(out, basis, coeff);
  }
  return out;
};

export const rationalToAlgebraic = (value: RationalValue): AlgebraicValue => normalizeAlgebraicValue({ one: value });

export const algebraicToRational = (value: AlgebraicValue): RationalValue | null => {
  const normalized = normalizeAlgebraicValue(value);
  if (normalized.sqrt2 || normalized.sqrt3 || normalized.sqrt6) {
    return null;
  }
  return normalized.one ? normalizeRational(normalized.one) : { num: 0n, den: 1n };
};

const rationalToNumber = (value: RationalValue): number =>
  Number(value.num) / Number(value.den);

export const algebraicToApproxNumber = (value: AlgebraicValue): number => {
  const normalized = normalizeAlgebraicValue(value);
  const one = normalized.one ? rationalToNumber(normalized.one) : 0;
  const sqrt2 = normalized.sqrt2 ? rationalToNumber(normalized.sqrt2) * Math.SQRT2 : 0;
  const sqrt3 = normalized.sqrt3 ? rationalToNumber(normalized.sqrt3) * Math.sqrt(3) : 0;
  const sqrt6 = normalized.sqrt6 ? rationalToNumber(normalized.sqrt6) * Math.sqrt(6) : 0;
  return one + sqrt2 + sqrt3 + sqrt6;
};

export const isAlgebraicZero = (value: AlgebraicValue): boolean => {
  const normalized = normalizeAlgebraicValue(value);
  return !normalized.one && !normalized.sqrt2 && !normalized.sqrt3 && !normalized.sqrt6;
};

export const addAlgebraic = (left: AlgebraicValue, right: AlgebraicValue): AlgebraicValue => {
  const out: Partial<Record<AlgebraicBasis, RationalValue>> = {};
  for (const basis of BASIS_ORDER) {
    const l = left[basis];
    const r = right[basis];
    if (l) {
      addCoeff(out, basis, l);
    }
    if (r) {
      addCoeff(out, basis, r);
    }
  }
  return normalizeAlgebraicValue(out);
};

export const negateAlgebraic = (value: AlgebraicValue): AlgebraicValue => {
  const out: Partial<Record<AlgebraicBasis, RationalValue>> = {};
  for (const basis of BASIS_ORDER) {
    const coeff = value[basis];
    if (!coeff) {
      continue;
    }
    out[basis] = negRational(normalizeRational(coeff));
  }
  return normalizeAlgebraicValue(out);
};

export const subAlgebraic = (left: AlgebraicValue, right: AlgebraicValue): AlgebraicValue =>
  addAlgebraic(left, negateAlgebraic(right));

const multiplyBasis = (
  leftBasis: AlgebraicBasis,
  rightBasis: AlgebraicBasis,
): { factor: RationalValue; basis: AlgebraicBasis } => {
  if (leftBasis === "one") {
    return { factor: { num: 1n, den: 1n }, basis: rightBasis };
  }
  if (rightBasis === "one") {
    return { factor: { num: 1n, den: 1n }, basis: leftBasis };
  }
  if (leftBasis === "sqrt2" && rightBasis === "sqrt2") {
    return { factor: { num: 2n, den: 1n }, basis: "one" };
  }
  if (leftBasis === "sqrt3" && rightBasis === "sqrt3") {
    return { factor: { num: 3n, den: 1n }, basis: "one" };
  }
  if (leftBasis === "sqrt6" && rightBasis === "sqrt6") {
    return { factor: { num: 6n, den: 1n }, basis: "one" };
  }
  if ((leftBasis === "sqrt2" && rightBasis === "sqrt3") || (leftBasis === "sqrt3" && rightBasis === "sqrt2")) {
    return { factor: { num: 1n, den: 1n }, basis: "sqrt6" };
  }
  if ((leftBasis === "sqrt2" && rightBasis === "sqrt6") || (leftBasis === "sqrt6" && rightBasis === "sqrt2")) {
    return { factor: { num: 2n, den: 1n }, basis: "sqrt3" };
  }
  if ((leftBasis === "sqrt3" && rightBasis === "sqrt6") || (leftBasis === "sqrt6" && rightBasis === "sqrt3")) {
    return { factor: { num: 3n, den: 1n }, basis: "sqrt2" };
  }
  throw new Error("Unsupported algebraic basis product.");
};

export const mulAlgebraic = (left: AlgebraicValue, right: AlgebraicValue): AlgebraicValue => {
  const out: Partial<Record<AlgebraicBasis, RationalValue>> = {};
  for (const leftBasis of BASIS_ORDER) {
    const leftCoeff = left[leftBasis];
    if (!leftCoeff) {
      continue;
    }
    for (const rightBasis of BASIS_ORDER) {
      const rightCoeff = right[rightBasis];
      if (!rightCoeff) {
        continue;
      }
      const basisProduct = multiplyBasis(leftBasis, rightBasis);
      const coeff = mulRational(mulRational(leftCoeff, rightCoeff), basisProduct.factor);
      addCoeff(out, basisProduct.basis, coeff);
    }
  }
  return normalizeAlgebraicValue(out);
};

const algOne = (): AlgebraicValue => ({ one: { num: 1n, den: 1n } });

const evaluateAutomorphism = (
  value: AlgebraicValue,
  sqrt2Sign: 1n | -1n,
  sqrt3Sign: 1n | -1n,
): AlgebraicValue => {
  const normalized = normalizeAlgebraicValue(value);
  const applySign = (coeff: RationalValue | undefined, sign: 1n | -1n): RationalValue | undefined =>
    coeff ? normalizeRational({ num: coeff.num * sign, den: coeff.den }) : undefined;
  return normalizeAlgebraicValue({
    one: normalized.one,
    sqrt2: applySign(normalized.sqrt2, sqrt2Sign),
    sqrt3: applySign(normalized.sqrt3, sqrt3Sign),
    sqrt6: applySign(normalized.sqrt6, (sqrt2Sign * sqrt3Sign) as 1n | -1n),
  });
};

const algebraicNorm = (value: AlgebraicValue): AlgebraicValue => {
  const c1 = evaluateAutomorphism(value, 1n, 1n);
  const c2 = evaluateAutomorphism(value, -1n, 1n);
  const c3 = evaluateAutomorphism(value, 1n, -1n);
  const c4 = evaluateAutomorphism(value, -1n, -1n);
  return mulAlgebraic(mulAlgebraic(c1, c2), mulAlgebraic(c3, c4));
};

export const invertAlgebraic = (value: AlgebraicValue): AlgebraicValue | null => {
  const a = evaluateAutomorphism(value, 1n, 1n);
  const b = evaluateAutomorphism(value, -1n, 1n);
  const c = evaluateAutomorphism(value, 1n, -1n);
  const d = evaluateAutomorphism(value, -1n, -1n);
  const numerator = mulAlgebraic(mulAlgebraic(b, c), d);
  const denominator = algebraicNorm(value);
  const rationalDen = algebraicToRational(denominator);
  if (!rationalDen || isRationalZero(rationalDen)) {
    return null;
  }
  const reciprocal = normalizeRational({ num: rationalDen.den, den: rationalDen.num });
  return mulAlgebraic(numerator, rationalToAlgebraic(reciprocal));
};

export const divAlgebraic = (left: AlgebraicValue, right: AlgebraicValue): AlgebraicValue | null => {
  const inverse = invertAlgebraic(right);
  if (!inverse) {
    return null;
  }
  return mulAlgebraic(left, inverse);
};

const formatRational = (value: RationalValue): string =>
  value.den === 1n ? value.num.toString() : `${value.num.toString()}/${value.den.toString()}`;

export const algebraicToDisplayString = (value: AlgebraicValue): string => {
  const normalized = normalizeAlgebraicValue(value);
  const parts: string[] = [];
  const pushTerm = (coeff: RationalValue | undefined, token: string): void => {
    if (!coeff) {
      return;
    }
    const normalizedCoeff = normalizeRational(coeff);
    if (isRationalZero(normalizedCoeff)) {
      return;
    }
    const sign = normalizedCoeff.num < 0n ? "-" : "+";
    const magnitude = normalizeRational({ num: absBigInt(normalizedCoeff.num), den: normalizedCoeff.den });
    const coeffText = token === "1"
      ? formatRational(magnitude)
      : (magnitude.num === 1n && magnitude.den === 1n ? token : `${formatRational(magnitude)}${token}`);
    if (parts.length === 0) {
      parts.push(sign === "-" ? `-${coeffText}` : coeffText);
      return;
    }
    parts.push(`${sign} ${coeffText}`);
  };
  pushTerm(normalized.one, "1");
  pushTerm(normalized.sqrt2, "sqrt(2)");
  pushTerm(normalized.sqrt3, "sqrt(3)");
  pushTerm(normalized.sqrt6, "sqrt(6)");
  return parts.length === 0 ? "0" : parts.join(" ");
};

export const algebraicEquals = (left: AlgebraicValue, right: AlgebraicValue): boolean => {
  const l = normalizeAlgebraicValue(left);
  const r = normalizeAlgebraicValue(right);
  for (const basis of BASIS_ORDER) {
    const lc = l[basis];
    const rc = r[basis];
    if (!lc && !rc) {
      continue;
    }
    if (!lc || !rc) {
      return false;
    }
    const ln = normalizeRational(lc);
    const rn = normalizeRational(rc);
    if (ln.num !== rn.num || ln.den !== rn.den) {
      return false;
    }
  }
  return true;
};

export const ALG_CONSTANTS = {
  one: algOne(),
  rotate15Cos: normalizeAlgebraicValue({
    sqrt2: { num: 1n, den: 4n },
    sqrt6: { num: 1n, den: 4n },
  }),
  rotate15Sin: normalizeAlgebraicValue({
    sqrt6: { num: 1n, den: 4n },
    sqrt2: { num: -1n, den: 4n },
  }),
} as const;
