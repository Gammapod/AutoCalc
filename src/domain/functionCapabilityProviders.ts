import type { CapabilityId } from "./predicateCapabilitySpec.js";
import {
  buildCapabilitySufficiencyById,
  type FunctionSufficiencySpec,
  type SufficientClause,
} from "./capabilitySemantics.js";

export type { FunctionSufficiencySpec, SufficientClause } from "./capabilitySemantics.js";

export type FunctionCapabilityProviderSpec = {
  id: string;
  label: string;
  rule: string;
  sufficiency: FunctionSufficiencySpec;
};

export const buildCapabilityProvidersFromCatalog = (): FunctionCapabilityProviderSpec[] => {
  const sufficiencyByCapability = buildCapabilitySufficiencyById();
  const providers: Array<FunctionCapabilityProviderSpec & { capability: Exclude<CapabilityId, "press_target_key"> }> = [
    {
      capability: "execute_activation",
      id: "fn.execute_activation",
      label: "execute_activation",
      rule: "= is unlocked",
      sufficiency: sufficiencyByCapability.execute_activation,
    },
    {
      capability: "step_plus_one",
      id: "fn.step_plus_one",
      label: "step_plus_one",
      rule: "= and + and 1 are unlocked",
      sufficiency: sufficiencyByCapability.step_plus_one,
    },
    {
      capability: "step_minus_one",
      id: "fn.step_minus_one",
      label: "step_minus_one",
      rule: "= and - and 1 are unlocked",
      sufficiency: sufficiencyByCapability.step_minus_one,
    },
    {
      capability: "reset_to_zero",
      id: "fn.reset_to_zero",
      label: "reset_to_zero",
      rule: "C or UNDO is unlocked",
      sufficiency: sufficiencyByCapability.reset_to_zero,
    },
    {
      capability: "allocator_return_press",
      id: "fn.allocator_return_press",
      label: "allocator_return_press",
      rule: "allocator RETURN action is available",
      sufficiency: sufficiencyByCapability.allocator_return_press,
    },
    {
      capability: "allocator_allocate_press",
      id: "fn.allocator_allocate_press",
      label: "allocator_allocate_press",
      rule: "allocator Allocate action is available",
      sufficiency: sufficiencyByCapability.allocator_allocate_press,
    },
    {
      capability: "form_operator_plus_operand",
      id: "fn.form_operator_plus_operand",
      label: "form_operator_plus_operand",
      rule: "at least one binary operator key and at least one value atom/composer are unlocked",
      sufficiency: sufficiencyByCapability.form_operator_plus_operand,
    },
    {
      capability: "unary_slot_commit",
      id: "fn.unary_slot_commit",
      label: "unary_slot_commit",
      rule: "at least one unary operator key is unlocked",
      sufficiency: sufficiencyByCapability.unary_slot_commit,
    },
    {
      capability: "roll_growth",
      id: "fn.roll_growth",
      label: "roll_growth",
      rule: "execute activation and at least one growth-producing operation",
      sufficiency: sufficiencyByCapability.roll_growth,
    },
    {
      capability: "roll_equal_run",
      id: "fn.roll_equal_run",
      label: "roll_equal_run",
      rule: "repeatable no-op execution pattern exists",
      sufficiency: sufficiencyByCapability.roll_equal_run,
    },
    {
      capability: "roll_incrementing_run",
      id: "fn.roll_incrementing_run",
      label: "roll_incrementing_run",
      rule: "= and + and 1 are unlocked",
      sufficiency: sufficiencyByCapability.roll_incrementing_run,
    },
    {
      capability: "roll_alternating_sign_constant_abs",
      id: "fn.roll_alternating_sign_constant_abs",
      label: "roll_alternating_sign_constant_abs",
      rule: "blocked: no sign-toggle key path is available in current key universe",
      sufficiency: sufficiencyByCapability.roll_alternating_sign_constant_abs,
    },
    {
      capability: "roll_constant_step_run",
      id: "fn.roll_constant_step_run",
      label: "roll_constant_step_run",
      rule: "execute activation and at least one operator are unlocked",
      sufficiency: sufficiencyByCapability.roll_constant_step_run,
    },
    {
      capability: "division_by_zero_error",
      id: "fn.division_by_zero_error",
      label: "division_by_zero_error",
      rule: "= and / and 0 are unlocked",
      sufficiency: sufficiencyByCapability.division_by_zero_error,
    },
    {
      capability: "euclid_division_operator",
      id: "fn.euclid_division_operator",
      label: "euclid_division_operator",
      rule: "# is unlocked",
      sufficiency: sufficiencyByCapability.euclid_division_operator,
    },
    {
      capability: "symbolic_result_error",
      id: "fn.symbolic_result_error",
      label: "symbolic_result_error",
      rule: "any execute key plus at least one symbolic atom key is unlocked",
      sufficiency: sufficiencyByCapability.symbolic_result_error,
    },
  ];

  return providers.map(({ capability: _capability, ...provider }) => provider);
};

export const staticFunctionCapabilityProviders: readonly FunctionCapabilityProviderSpec[] =
  buildCapabilityProvidersFromCatalog();

export const buildCapabilityToProviderIndex = (
  providers: readonly FunctionCapabilityProviderSpec[],
): Record<Exclude<CapabilityId, "press_target_key">, string[]> => ({
  execute_activation: providers.filter((provider) => provider.id === "fn.execute_activation").map((provider) => provider.id),
  step_plus_one: providers.filter((provider) => provider.id === "fn.step_plus_one").map((provider) => provider.id),
  step_minus_one: providers.filter((provider) => provider.id === "fn.step_minus_one").map((provider) => provider.id),
  reset_to_zero: providers.filter((provider) => provider.id === "fn.reset_to_zero").map((provider) => provider.id),
  form_operator_plus_operand: providers.filter((provider) => provider.id === "fn.form_operator_plus_operand").map((provider) => provider.id),
  unary_slot_commit: providers.filter((provider) => provider.id === "fn.unary_slot_commit").map((provider) => provider.id),
  allocator_return_press: providers.filter((provider) => provider.id === "fn.allocator_return_press").map((provider) => provider.id),
  allocator_allocate_press: providers.filter((provider) => provider.id === "fn.allocator_allocate_press").map((provider) => provider.id),
  roll_growth: providers.filter((provider) => provider.id === "fn.roll_growth").map((provider) => provider.id),
  roll_equal_run: providers.filter((provider) => provider.id === "fn.roll_equal_run").map((provider) => provider.id),
  roll_incrementing_run: providers.filter((provider) => provider.id === "fn.roll_incrementing_run").map((provider) => provider.id),
  roll_alternating_sign_constant_abs: providers.filter((provider) => provider.id === "fn.roll_alternating_sign_constant_abs").map((provider) => provider.id),
  roll_constant_step_run: providers.filter((provider) => provider.id === "fn.roll_constant_step_run").map((provider) => provider.id),
  division_by_zero_error: providers.filter((provider) => provider.id === "fn.division_by_zero_error").map((provider) => provider.id),
  euclid_division_operator: providers.filter((provider) => provider.id === "fn.euclid_division_operator").map((provider) => provider.id),
  symbolic_result_error: providers.filter((provider) => provider.id === "fn.symbolic_result_error").map((provider) => provider.id),
});

export const capabilityToFunctionProviderIds = buildCapabilityToProviderIndex(staticFunctionCapabilityProviders);


