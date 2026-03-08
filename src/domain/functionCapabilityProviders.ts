import { keyCatalog } from "../content/keyCatalog.js";
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

const keysWithTrait = (trait: string): Key[] =>
  keyCatalog
    .filter((entry) => entry.traits.includes(trait as never))
    .map((entry) => entry.key as Key);

const operatorKeys = (): Key[] =>
  keyCatalog
    .filter((entry) => entry.unlockGroup === "slotOperators")
    .map((entry) => entry.key as Key);

const hasKey = (key: string): key is Key => keyCatalog.some((entry) => entry.key === key);

const uniqueClauses = (clauses: Array<Array<Key | string>>): Key[][] => {
  const seen = new Set<string>();
  const deduped: Key[][] = [];
  for (const clause of clauses) {
    const normalized = [...new Set(clause)] as Key[];
    if (normalized.length === 0) {
      continue;
    }
    const signature = normalized.join("|");
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(normalized);
  }
  return deduped;
};

const clause = (...keys: Array<Key | null>): Key[] => keys.filter((key): key is Key => key !== null);

export const buildCapabilityProvidersFromCatalog = (): FunctionCapabilityProviderSpec[] => {
  const executeKeys = keysWithTrait("can_execute");
  const operatorKeysList = operatorKeys();
  const plusKey = hasKey("+") ? "+" : null;
  const minusKey = hasKey("-") ? "-" : null;
  const negKey = hasKey("NEG") ? "NEG" : null;
  const equalsKey = hasKey("=") ? "=" : null;
  const incrementKey = hasKey("++") ? "++" : null;
  const decrementKey = hasKey("--") ? "--" : null;
  const clearKey = hasKey("C") ? "C" : null;
  const undoKey = hasKey("UNDO") ? "UNDO" : null;
  const divideKey = hasKey("/") ? "/" : null;
  const zeroKey = hasKey("0") ? "0" : null;
  const euclidKey = hasKey("#") ? "#" : null;
  const piKey = hasKey("pi") ? "pi" : null;
  const eKey = hasKey("e") ? "e" : null;

  const operatorClauses = operatorKeysList.map((operator) => [operator]);
  const executeActivationClauses = executeKeys.map((key) => [key]);
  const stepPlusClauses = uniqueClauses([
    ...(incrementKey ? [clause(incrementKey)] : []),
    ...(equalsKey && plusKey ? [clause(equalsKey, plusKey)] : []),
  ]);
  const stepMinusClauses = uniqueClauses([
    ...(decrementKey ? [clause(decrementKey)] : []),
    ...(equalsKey && minusKey ? [clause(equalsKey, minusKey)] : []),
    ...(equalsKey && plusKey && negKey ? [clause(equalsKey, plusKey, negKey)] : []),
  ]);
  const resetClauses = uniqueClauses([
    ...(clearKey ? [clause(clearKey)] : []),
    ...(undoKey ? [clause(undoKey)] : []),
  ]);

  const rollGrowthClauses = uniqueClauses([
    ...(equalsKey && incrementKey ? [clause(equalsKey, incrementKey)] : []),
    ...(equalsKey && decrementKey ? [clause(equalsKey, decrementKey)] : []),
    ...(equalsKey ? operatorClauses.map((clause) => [equalsKey, ...clause]) : []),
  ]);

  const rollEqualRunClauses = uniqueClauses([
    ...(incrementKey ? [clause(incrementKey)] : []),
    ...(equalsKey && plusKey ? [clause(equalsKey, plusKey)] : []),
    ...(equalsKey && minusKey ? [clause(equalsKey, minusKey)] : []),
    ...(equalsKey && hasKey("*") ? [clause(equalsKey, "*")] : []),
    ...(equalsKey && divideKey ? [clause(equalsKey, divideKey)] : []),
  ]);

  const rollIncrementingClauses = uniqueClauses([
    ...(incrementKey ? [clause(incrementKey)] : []),
    ...(equalsKey && plusKey ? [clause(equalsKey, plusKey)] : []),
  ]);

  const rollAlternatingSignClauses = uniqueClauses([
    ...(equalsKey && plusKey && negKey ? [clause(equalsKey, plusKey, negKey)] : []),
  ]);

  const rollConstantStepClauses = uniqueClauses([
    ...(equalsKey
      ? [
          ...(plusKey ? [clause(equalsKey, plusKey)] : []),
          ...(minusKey ? [clause(equalsKey, minusKey)] : []),
          ...(hasKey("*") ? [clause(equalsKey, "*")] : []),
          ...(divideKey ? [clause(equalsKey, divideKey)] : []),
          ...(euclidKey ? [clause(equalsKey, euclidKey)] : []),
          ...(hasKey("\u27E1") ? [clause(equalsKey, "\u27E1")] : []),
        ]
      : []),
    ...(incrementKey ? [clause(incrementKey)] : []),
    ...(decrementKey ? [clause(decrementKey)] : []),
  ]);

  const providers: FunctionCapabilityProviderSpec[] = [
    {
      id: "fn.execute_activation",
      label: "execute_activation",
      rule: "any execution key is unlocked",
      sufficiency: executeActivationClauses,
    },
    {
      id: "fn.step_plus_one",
      label: "step_plus_one",
      rule: "++ is unlocked OR (= and + are unlocked)",
      sufficiency: stepPlusClauses,
    },
    {
      id: "fn.step_minus_one",
      label: "step_minus_one",
      rule: "-- is unlocked OR (= and -) OR (= and + and NEG)",
      sufficiency: stepMinusClauses,
    },
    {
      id: "fn.reset_to_zero",
      label: "reset_to_zero",
      rule: "C or UNDO is unlocked",
      sufficiency: resetClauses,
    },
    {
      id: "fn.allocator_return_press",
      label: "allocator_return_press",
      rule: "allocator RETURN action is available",
      sufficiency: incrementKey ? [clause(incrementKey)] : executeActivationClauses,
    },
    {
      id: "fn.allocator_allocate_press",
      label: "allocator_allocate_press",
      rule: "allocator Allocate action is available",
      sufficiency: incrementKey ? [clause(incrementKey)] : executeActivationClauses,
    },
    {
      id: "fn.form_operator_plus_operand",
      label: "form_operator_plus_operand",
      rule: "at least one operator key and at least one value atom/composer are unlocked",
      sufficiency: operatorClauses,
    },
    {
      id: "fn.roll_growth",
      label: "roll_growth",
      rule: "execute activation and at least one growth-producing operation",
      sufficiency: rollGrowthClauses,
    },
    {
      id: "fn.roll_equal_run",
      label: "roll_equal_run",
      rule: "repeatable no-op execution pattern exists",
      sufficiency: rollEqualRunClauses,
    },
    {
      id: "fn.roll_incrementing_run",
      label: "roll_incrementing_run",
      rule: "++ is unlocked OR (= and + are unlocked)",
      sufficiency: rollIncrementingClauses,
    },
    {
      id: "fn.roll_alternating_sign_constant_abs",
      label: "roll_alternating_sign_constant_abs",
      rule: "= and + and NEG are unlocked",
      sufficiency: rollAlternatingSignClauses,
    },
    {
      id: "fn.roll_constant_step_run",
      label: "roll_constant_step_run",
      rule: "execute activation and at least one operator are unlocked",
      sufficiency: rollConstantStepClauses,
    },
    {
      id: "fn.division_by_zero_error",
      label: "division_by_zero_error",
      rule: "= and / and 0 are unlocked",
      sufficiency: uniqueClauses(equalsKey && divideKey && zeroKey ? [clause(equalsKey, divideKey, zeroKey)] : []),
    },
    {
      id: "fn.euclid_division_operator",
      label: "euclid_division_operator",
      rule: "# is unlocked",
      sufficiency: uniqueClauses(euclidKey ? [clause(euclidKey)] : []),
    },
    {
      id: "fn.symbolic_result_error",
      label: "symbolic_result_error",
      rule: "any execute key plus at least one symbolic atom key is unlocked",
      sufficiency: uniqueClauses(
        executeKeys.flatMap((executeKey) => [
          ...(piKey ? [[executeKey, piKey]] : []),
          ...(eKey ? [[executeKey, eKey]] : []),
        ]),
      ),
    },
  ];

  for (const provider of providers) {
    if (provider.sufficiency.length === 0) {
      throw new Error(`Generated provider ${provider.id} has no sufficient clauses. Check keyCatalog traits.`);
    }
  }

  return providers;
};

export const staticFunctionCapabilityProviders: readonly FunctionCapabilityProviderSpec[] =
  buildCapabilityProvidersFromCatalog();

export const buildCapabilityToProviderIndex = (
  _providers: readonly FunctionCapabilityProviderSpec[],
): Record<Exclude<CapabilityId, "press_target_key">, string[]> => ({
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
  symbolic_result_error: ["fn.symbolic_result_error"],
});

export const capabilityToFunctionProviderIds = buildCapabilityToProviderIndex(staticFunctionCapabilityProviders);
