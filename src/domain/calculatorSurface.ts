import type { CalculatorId, GameState, LayoutSurface } from "./types.js";

export type CalculatorKeypadSurface =
  | "keypad_f"
  | "keypad_g"
  | "keypad_menu"
  | "keypad_f_prime"
  | "keypad_g_prime"
  | "keypad_h_prime"
  | "keypad_i_prime";

export const isSpecificCalculatorKeypadSurface = (
  surface: LayoutSurface,
): surface is CalculatorKeypadSurface =>
  surface === "keypad_f"
  || surface === "keypad_g"
  || surface === "keypad_menu"
  || surface === "keypad_f_prime"
  || surface === "keypad_g_prime"
  || surface === "keypad_h_prime"
  || surface === "keypad_i_prime";

export const isAnyKeypadSurface = (
  surface: LayoutSurface,
): surface is "keypad" | CalculatorKeypadSurface =>
  surface === "keypad" || isSpecificCalculatorKeypadSurface(surface);

export const toCalculatorSurface = (calculatorId: CalculatorId): CalculatorKeypadSurface =>
  calculatorId === "g"
    ? "keypad_g"
    : calculatorId === "menu"
      ? "keypad_menu"
      : calculatorId === "f_prime"
        ? "keypad_f_prime"
        : calculatorId === "g_prime"
          ? "keypad_g_prime"
          : calculatorId === "h_prime"
            ? "keypad_h_prime"
            : calculatorId === "i_prime"
              ? "keypad_i_prime"
          : "keypad_f";

export const fromCalculatorSurface = (surface: CalculatorKeypadSurface): CalculatorId =>
  surface === "keypad_g"
    ? "g"
    : surface === "keypad_menu"
      ? "menu"
      : surface === "keypad_f_prime"
        ? "f_prime"
        : surface === "keypad_g_prime"
          ? "g_prime"
          : surface === "keypad_h_prime"
            ? "h_prime"
            : surface === "keypad_i_prime"
              ? "i_prime"
          : "f";

export const resolveSurfaceCalculatorId = (state: GameState, surface: LayoutSurface): CalculatorId | null => {
  if (surface === "storage") {
    return null;
  }
  if (surface === "keypad") {
    return resolveActiveCalculatorIdFromState(state);
  }
  if (surface === "keypad_f") {
    return "f";
  }
  const calculatorId = fromCalculatorSurface(surface);
  return state.calculators?.[calculatorId] ? calculatorId : null;
};

export const getKeyLayoutForSurface = (state: GameState, surface: LayoutSurface): GameState["ui"]["keyLayout"] | null => {
  if (surface === "storage") {
    return null;
  }
  if (surface === "keypad") {
    const activeCalculatorId = resolveActiveCalculatorIdFromState(state);
    return state.calculators?.[activeCalculatorId]?.ui.keyLayout ?? state.ui.keyLayout;
  }
  if (surface === "keypad_f") {
    return state.calculators?.f?.ui.keyLayout ?? state.ui.keyLayout;
  }
  const calculatorId = fromCalculatorSurface(surface);
  return state.calculators?.[calculatorId]?.ui.keyLayout ?? (calculatorId === "f" ? state.ui.keyLayout : null);
};
const resolveActiveCalculatorIdFromState = (state: GameState): CalculatorId => {
  if (state.activeCalculatorId) {
    return state.activeCalculatorId;
  }
  const order = state.calculatorOrder ?? [];
  if (order.length > 0) {
    return order[0];
  }
  if (state.calculators?.f) {
    return "f";
  }
  if (state.calculators?.g) {
    return "g";
  }
  if (state.calculators?.menu) {
    return "menu";
  }
  if (state.calculators?.f_prime) {
    return "f_prime";
  }
  if (state.calculators?.g_prime) {
    return "g_prime";
  }
  if (state.calculators?.h_prime) {
    return "h_prime";
  }
  if (state.calculators?.i_prime) {
    return "i_prime";
  }
  return "f";
};
