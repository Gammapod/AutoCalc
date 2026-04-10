import { applySetKeypadDimensions } from "./reducer.layout.js";
import type { GameState, LambdaControl } from "./types.js";
import { projectControlFromState } from "./controlProjection.js";

const lambdaControlEquals = (a: LambdaControl, b: LambdaControl): boolean =>
  a.alpha === b.alpha
  && a.beta === b.beta
  && a.gamma === b.gamma
  && a.delta === b.delta
  && a.epsilon === b.epsilon;

export const applyAllocatorRuntimeProjection = (
  state: GameState,
  lambdaControl: LambdaControl,
): GameState => {
  const withControl = lambdaControlEquals(lambdaControl, state.lambdaControl)
    ? state
    : { ...state, lambdaControl };
  const projection = projectControlFromState(withControl);
  const resized = applySetKeypadDimensions(withControl, projection.keypadColumns, projection.keypadRows);
  if (
    resized.unlocks.maxTotalDigits === projection.maxTotalDigits
    && resized.unlocks.maxSlots === projection.maxSlots
  ) {
    return resized;
  }
  return {
    ...resized,
    unlocks: {
      ...resized.unlocks,
      maxTotalDigits: projection.maxTotalDigits,
      maxSlots: projection.maxSlots,
    },
  };
};
