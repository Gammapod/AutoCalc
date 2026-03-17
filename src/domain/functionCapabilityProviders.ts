import { getContentProvider } from "../contracts/contentRegistry.js";

import type { Key } from "./types.js";
import { isBinaryOperatorKeyId, isUnaryOperatorId, KEY_ID, toKeyId } from "./keyPresentation.js";
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
  getContentProvider().keyCatalog
    .filter((entry) => entry.traits.includes(trait as never))
     .map((entry) => toKeyId(entry.key));

const operatorKeys = (): Key[] =>
  getContentProvider().keyCatalog
    .filter((entry) => isBinaryOperatorKeyId(toKeyId(entry.key)))
     .map((entry) => toKeyId(entry.key));

const unaryOperatorKeys = (): Key[] =>
  getContentProvider().keyCatalog
    .filter((entry) => isUnaryOperatorId(toKeyId(entry.key)))
     .map((entry) => toKeyId(entry.key));

const hasKey = (key: Key): boolean => getContentProvider().keyCatalog.some((entry) => toKeyId(entry.key) === key);

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
  const unaryOperatorKeysList = unaryOperatorKeys();
  const plusKey = hasKey(KEY_ID.op_add) ? KEY_ID.op_add : null;
  const minusKey = hasKey(KEY_ID.op_sub) ? KEY_ID.op_sub : null;
  const oneKey = hasKey(KEY_ID.digit_1) ? KEY_ID.digit_1 : null;
  const equalsKey = hasKey(KEY_ID.exec_equals) ? KEY_ID.exec_equals : null;
  const clearKey = hasKey(KEY_ID.util_clear_all) ? KEY_ID.util_clear_all : null;
  const undoKey = hasKey(KEY_ID.util_undo) ? KEY_ID.util_undo : null;
  const divideKey = hasKey(KEY_ID.op_div) ? KEY_ID.op_div : null;
  const zeroKey = hasKey(KEY_ID.digit_0) ? KEY_ID.digit_0 : null;
  const euclidKey = hasKey(KEY_ID.op_euclid_div) ? KEY_ID.op_euclid_div : null;
  const piKey = hasKey(KEY_ID.const_pi) ? KEY_ID.const_pi : null;
  const eKey = hasKey(KEY_ID.const_e) ? KEY_ID.const_e : null;
  const unaryIncrementKey = hasKey(KEY_ID.unary_inc) ? KEY_ID.unary_inc : null;
  const unaryDecrementKey = hasKey(KEY_ID.unary_dec) ? KEY_ID.unary_dec : null;
  const unaryNegateKey = hasKey(KEY_ID.unary_neg) ? KEY_ID.unary_neg : null;

  const operatorClauses = operatorKeysList.map((operator) => [operator]);
  const unaryClauses = unaryOperatorKeysList.map((operator) => [operator]);
  const executeActivationClauses = executeKeys.map((key) => [key]);
  const stepPlusClauses = uniqueClauses([
    ...(equalsKey && plusKey && oneKey ? [clause(equalsKey, plusKey, oneKey)] : []),
    ...(equalsKey && unaryIncrementKey ? [clause(equalsKey, unaryIncrementKey)] : []),
  ]);
  const stepMinusClauses = uniqueClauses([
    ...(equalsKey && minusKey && oneKey ? [clause(equalsKey, minusKey, oneKey)] : []),
    ...(equalsKey && unaryDecrementKey ? [clause(equalsKey, unaryDecrementKey)] : []),
  ]);
  const resetClauses = uniqueClauses([
    ...(clearKey ? [clause(clearKey)] : []),
    ...(undoKey ? [clause(undoKey)] : []),
  ]);

  const rollGrowthClauses = uniqueClauses([
    ...(equalsKey ? operatorClauses.map((clause) => [equalsKey, ...clause]) : []),
  ]);

  const rollEqualRunClauses = uniqueClauses([
    ...(equalsKey && plusKey ? [clause(equalsKey, plusKey)] : []),
    ...(equalsKey && minusKey ? [clause(equalsKey, minusKey)] : []),
    ...(equalsKey && hasKey(KEY_ID.op_mul) ? [clause(equalsKey, KEY_ID.op_mul)] : []),
    ...(equalsKey && divideKey ? [clause(equalsKey, divideKey)] : []),
  ]);

  const rollIncrementingClauses = uniqueClauses([
    ...(equalsKey && plusKey && oneKey ? [clause(equalsKey, plusKey, oneKey)] : []),
  ]);

  const rollAlternatingSignClauses = uniqueClauses([
    ...(equalsKey && unaryNegateKey ? [clause(equalsKey, unaryNegateKey)] : []),
  ]);

  const rollConstantStepClauses = uniqueClauses([
    ...(equalsKey
      ? [
          ...(plusKey ? [clause(equalsKey, plusKey)] : []),
          ...(minusKey ? [clause(equalsKey, minusKey)] : []),
          ...(hasKey(KEY_ID.op_mul) ? [clause(equalsKey, KEY_ID.op_mul)] : []),
          ...(divideKey ? [clause(equalsKey, divideKey)] : []),
          ...(euclidKey ? [clause(equalsKey, euclidKey)] : []),
          ...(hasKey(KEY_ID.op_mod) ? [clause(equalsKey, KEY_ID.op_mod)] : []),
          ...(unaryIncrementKey ? [clause(equalsKey, unaryIncrementKey)] : []),
          ...(unaryDecrementKey ? [clause(equalsKey, unaryDecrementKey)] : []),
        ]
      : []),
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
      rule: "= and + and 1 are unlocked",
      sufficiency: stepPlusClauses,
    },
    {
      id: "fn.step_minus_one",
      label: "step_minus_one",
      rule: "= and - and 1 are unlocked",
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
      sufficiency: executeActivationClauses,
    },
    {
      id: "fn.allocator_allocate_press",
      label: "allocator_allocate_press",
      rule: "allocator Allocate action is available",
      sufficiency: executeActivationClauses,
    },
    {
      id: "fn.form_operator_plus_operand",
      label: "form_operator_plus_operand",
      rule: "at least one binary operator key and at least one value atom/composer are unlocked",
      sufficiency: operatorClauses,
    },
    {
      id: "fn.unary_slot_commit",
      label: "unary_slot_commit",
      rule: "at least one unary operator key is unlocked",
      sufficiency: unaryClauses,
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
      rule: "= and + and 1 are unlocked",
      sufficiency: rollIncrementingClauses,
    },
    {
      id: "fn.roll_alternating_sign_constant_abs",
      label: "roll_alternating_sign_constant_abs",
      rule: "blocked: no sign-toggle key path is available in current key universe",
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
  unary_slot_commit: ["fn.unary_slot_commit"],
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


