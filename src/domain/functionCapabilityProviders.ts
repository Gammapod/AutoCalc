import type { Key } from "./types.js";
import type { CapabilityId } from "./predicateCapabilitySpec.js";

export type SufficientClause = readonly Key[];
export type FunctionSufficiencySpec = readonly SufficientClause[];

export type FunctionCapabilityProviderSpec = {
  id: string;
  label: string;
  rule: string;
  sufficiency: FunctionSufficiencySpec;
};

const OPERATOR_KEYS: Key[] = ["+", "-", "*", "/", "#", "\u27E1"];
const operatorClauses = (): Key[][] => OPERATOR_KEYS.map((operator) => [operator]);

export const staticFunctionCapabilityProviders: readonly FunctionCapabilityProviderSpec[] = [
  {
    id: "fn.execute_activation",
    label: "execute_activation",
    rule: "= or ++ or -- is unlocked",
    sufficiency: [["="], ["++"], ["--"]],
  },
  {
    id: "fn.step_plus_one",
    label: "step_plus_one",
    rule: "++ is unlocked OR (= and + and 1 are unlocked)",
    sufficiency: [["++"], ["=", "+"]],
  },
  {
    id: "fn.step_minus_one",
    label: "step_minus_one",
    rule: "-- is unlocked OR (= and - and 1) OR (= and + and NEG and 1)",
    sufficiency: [["--"], ["=", "-"], ["=", "+", "NEG"]],
  },
  {
    id: "fn.reset_to_zero",
    label: "reset_to_zero",
    rule: "C or UNDO is unlocked",
    sufficiency: [["C"], ["UNDO"]],
  },
  {
    id: "fn.allocator_return_press",
    label: "allocator_return_press",
    rule: "allocator RETURN action is available",
    sufficiency: [["++"]],
  },
  {
    id: "fn.allocator_allocate_press",
    label: "allocator_allocate_press",
    rule: "allocator Allocate action is available",
    sufficiency: [["++"]],
  },
  {
    id: "fn.form_operator_plus_operand",
    label: "form_operator_plus_operand",
    rule: "at least one operator key and at least one value key are unlocked",
    sufficiency: operatorClauses(),
  },
  {
    id: "fn.roll_growth",
    label: "roll_growth",
    rule: "execute activation and at least one growth-producing operation",
    sufficiency: [
      ["=", "++"],
      ["=", "--"],
      ...operatorClauses().map((clause) => ["=", ...clause] as Key[]),
    ],
  },
  {
    id: "fn.roll_equal_run",
    label: "roll_equal_run",
    rule: "++ is unlocked OR (= and one of +,-,*,/ is unlocked)",
    sufficiency: [["++"], ["=", "+"], ["=", "-"], ["=", "*"], ["=", "/"]],
  },
  {
    id: "fn.roll_incrementing_run",
    label: "roll_incrementing_run",
    rule: "++ is unlocked OR (= and + are unlocked)",
    sufficiency: [["++"], ["=", "+"]],
  },
  {
    id: "fn.roll_alternating_sign_constant_abs",
    label: "roll_alternating_sign_constant_abs",
    rule: "= and + and NEG and at least one value key are unlocked",
    sufficiency: [["=", "+", "NEG"]],
  },
  {
    id: "fn.roll_constant_step_run",
    label: "roll_constant_step_run",
    rule: "execute activation and at least one operator are unlocked",
    sufficiency: [["=", "+"], ["=", "-"], ["=", "*"], ["=", "/"], ["=", "#"], ["=", "\u27E1"], ["++"], ["--"]],
  },
  {
    id: "fn.division_by_zero_error",
    label: "division_by_zero_error",
    rule: "= and / and 0 are unlocked",
    sufficiency: [["=", "/", "0"]],
  },
  {
    id: "fn.euclid_division_operator",
    label: "euclid_division_operator",
    rule: "# is unlocked",
    sufficiency: [["#"]],
  },
];

export const capabilityToFunctionProviderIds: Record<Exclude<CapabilityId, "press_target_key">, string[]> = {
  execute_activation: ["fn.execute_activation"],
  step_plus_one: ["fn.step_plus_one"],
  step_minus_one: ["fn.step_minus_one"],
  reset_to_zero: ["fn.reset_to_zero"],
  form_operator_plus_operand: ["fn.form_operator_plus_operand"],
  allocator_return_press: ["fn.allocator_return_press"],
  allocator_allocate_press: ["fn.allocator_allocate_press"],
  roll_growth: ["fn.roll_growth"],
  roll_equal_run: ["fn.roll_equal_run"],
  roll_incrementing_run: ["fn.roll_incrementing_run"],
  roll_alternating_sign_constant_abs: ["fn.roll_alternating_sign_constant_abs"],
  roll_constant_step_run: ["fn.roll_constant_step_run"],
  division_by_zero_error: ["fn.division_by_zero_error"],
  euclid_division_operator: ["fn.euclid_division_operator"],
};

