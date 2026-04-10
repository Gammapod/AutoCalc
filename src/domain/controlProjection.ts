import {
  getAutoEqualsRateMultiplier,
  getLambdaDerivedValues,
  sanitizeLambdaControl,
} from "./lambdaControl.js";
import { getEffectiveControlProfile, resolveStateCalculatorId } from "./controlProfileRuntime.js";
import type {
  CalculatorId,
  ControlProfile,
  ControlProjection,
  GameState,
  LambdaControl,
} from "./types.js";

const resolveCalculatorControl = (state: GameState, calculatorId: CalculatorId): LambdaControl => {
  const activeCalculatorId = resolveStateCalculatorId(state);
  if (calculatorId === activeCalculatorId) {
    return state.lambdaControl;
  }
  return state.calculators?.[calculatorId]?.lambdaControl ?? state.lambdaControl;
};

export const projectControlFromInputs = (
  controlInput: LambdaControl,
  profile: ControlProfile,
  calculatorId: CalculatorId = profile.id,
): ControlProjection => {
  const control = sanitizeLambdaControl(controlInput, profile);
  const derived = getLambdaDerivedValues(control, profile);
  return {
    calculatorId,
    control,
    fields: derived.effectiveFields,
    budget: {
      spent: derived.spentPoints,
      unused: derived.unusedPoints,
      maxPoints: 0,
    },
    keypadColumns: derived.effectiveFields.alpha,
    keypadRows: derived.effectiveFields.beta,
    maxSlots: derived.effectiveFields.gamma,
    maxTotalDigits: derived.effectiveFields.delta,
    deltaEffective: derived.deltaEffective,
    epsilonEffective: derived.epsilonEffective,
    autoEqualsRateMultiplier: getAutoEqualsRateMultiplier(control, profile),
  };
};

export const projectControlFromState = (
  state: GameState,
  calculatorId: CalculatorId = resolveStateCalculatorId(state),
): ControlProjection => {
  const profile = getEffectiveControlProfile(state, calculatorId);
  return projectControlFromInputs(resolveCalculatorControl(state, calculatorId), profile, calculatorId);
};
