import type { CalculatorId, ControlField, ControlProfile } from "./types.js";

const zeroCoefficients = (): Record<ControlField, number> => ({
  alpha: 0,
  beta: 0,
  gamma: 0,
  delta: 0,
  epsilon: 0,
});

const coeff = (patch: Partial<Record<ControlField, number>>): Record<ControlField, number> => ({
  ...zeroCoefficients(),
  ...patch,
});

export const controlProfiles: Record<CalculatorId, ControlProfile> = {
  f: {
    id: "f",
    starts: {
      alpha: 3,
      beta: 2,
      gamma: 1,
      delta: 1,
      epsilon: 0,
    },
    settable: {
      alpha: true,
      beta: true,
      gamma: true,
      delta: false,
      epsilon: false,
    },
    bounds: {
      alpha: { min: 1, max: 8 },
      beta: { min: 1, max: 8 },
      gamma: { min: 0, max: 4 },
      delta: { min: 1, max: null },
      epsilon: { min: 0, max: null },
    },
    equations: {
      alpha: { coefficients: coeff({ alpha: 1 }), constant: 0 },
      beta: { coefficients: coeff({ beta: 1 }), constant: 0 },
      gamma: { coefficients: coeff({ gamma: 1 }), constant: 0 },
      delta: { coefficients: coeff({ alpha: 0.5, beta: 0.5, gamma: 1 }), constant: 0 },
      epsilon: { coefficients: coeff({ alpha: 0.1, beta: 0.1, gamma: 0.1, delta: 0.1 }), constant: 0.1 },
    },
    rounding: "floor",
    gammaMinAfterOne: true,
  },
  g: {
    id: "g",
    starts: {
      alpha: 4,
      beta: 2,
      gamma: 3,
      delta: 8,
      epsilon: 0,
    },
    settable: {
      alpha: false,
      beta: false,
      gamma: true,
      delta: false,
      epsilon: false,
    },
    bounds: {
      alpha: { min: 1, max: 4 },
      beta: { min: 2, max: 2 },
      gamma: { min: 0, max: 11 },
      delta: { min: 8, max: 8 },
      epsilon: { min: 0, max: null },
    },
    equations: {
      alpha: { coefficients: coeff({ gamma: -0.25 }), constant: 5 },
      beta: { coefficients: coeff({ beta: 1 }), constant: 0 },
      gamma: { coefficients: coeff({ gamma: 1 }), constant: 0 },
      delta: { coefficients: coeff({ delta: 1 }), constant: 0 },
      epsilon: { coefficients: coeff({ gamma: 0.5 }), constant: -0.5 },
    },
    rounding: "floor",
  },
  menu: {
    id: "menu",
    starts: {
      alpha: 1,
      beta: 6,
      gamma: 0,
      delta: 0,
      epsilon: 0,
    },
    settable: {
      alpha: false,
      beta: false,
      gamma: false,
      delta: false,
      epsilon: false,
    },
    bounds: {
      alpha: { min: 1, max: 1 },
      beta: { min: 6, max: 6 },
      gamma: { min: 0, max: 0 },
      delta: { min: 0, max: 0 },
      epsilon: { min: 0, max: 0 },
    },
    equations: {
      alpha: { coefficients: coeff({ alpha: 1 }), constant: 0 },
      beta: { coefficients: coeff({ beta: 1 }), constant: 0 },
      gamma: { coefficients: coeff({ gamma: 1 }), constant: 0 },
      delta: { coefficients: coeff({ delta: 1 }), constant: 0 },
      epsilon: { coefficients: coeff({ epsilon: 1 }), constant: 0 },
    },
    rounding: "floor",
  },
};

