import { getAppServices } from "../contracts/appServices.js";
import type { CalculatorId, ControlProfile, GameState } from "./types.js";

export const resolveStateCalculatorId = (state: GameState): CalculatorId =>
  state.activeCalculatorId ?? "f";

export const getBaseControlProfile = (calculatorId: CalculatorId): ControlProfile =>
  getAppServices().contentProvider.controlProfiles[calculatorId];

export const getEffectiveControlProfile = (state: GameState, calculatorId: CalculatorId = resolveStateCalculatorId(state)): ControlProfile =>
  getBaseControlProfile(calculatorId);
