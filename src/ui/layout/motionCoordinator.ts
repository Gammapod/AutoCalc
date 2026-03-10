import type { CalculatorLayoutSnapshot, MotionIntent } from "./types.js";

const toGrowDirection = (
  previous: CalculatorLayoutSnapshot,
  next: CalculatorLayoutSnapshot,
): "" | "row" | "column" | "both" => {
  const grewRows = next.keypad.rows > previous.keypad.rows;
  const grewColumns = next.keypad.columns > previous.keypad.columns;
  if (grewRows && grewColumns) {
    return "both";
  }
  if (grewRows) {
    return "row";
  }
  if (grewColumns) {
    return "column";
  }
  return "";
};

const toKind = (direction: "" | "row" | "column" | "both"): MotionIntent["kind"] => {
  if (direction === "row") {
    return "keypad_grow_row";
  }
  if (direction === "column") {
    return "keypad_grow_col";
  }
  if (direction === "both") {
    return "keypad_grow_both";
  }
  return "none";
};

export const resolveLayoutMotionIntent = (
  previous: CalculatorLayoutSnapshot | null,
  next: CalculatorLayoutSnapshot,
  options: {
    reduceMotion: boolean;
  },
): MotionIntent => {
  if (options.reduceMotion) {
    return {
      kind: "none",
      forCalculatorId: next.id,
      keypadGrowDirection: "",
    };
  }

  if (!previous) {
    return {
      kind: "none",
      forCalculatorId: next.id,
      keypadGrowDirection: "",
    };
  }

  const growDirection = toGrowDirection(previous, next);
  return {
    kind: toKind(growDirection),
    forCalculatorId: next.id,
    keypadGrowDirection: growDirection,
  };
};
