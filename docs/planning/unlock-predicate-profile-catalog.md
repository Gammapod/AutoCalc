# Unlock Predicate Profile Catalog (Starter)

Purpose: define concrete predicate profiles (parameterized checks) that can be used as row/column units in a future profile-level pairwise matrix.

This complements `docs/planning/unlock-predicate-pairwise-matrix.md` (type-level matrix) and does not replace it.

## Profile Schema

Use this logical shape for each profile:

```ts
type PredicateProfile = {
  profileId: string;                 // Stable ID used in profile-level matrix cells
  predicateType: string;             // UnlockPredicate["type"] or proposed type
  status: "implemented" | "proposed";
  params: Record<string, unknown>;   // Concrete parameterization
  coverageClass: "core" | "edge" | "stress";
  satisfierExample: string;          // Minimal R:[...] or A:[...] example
  notes?: string;
};
```

## Usage Rules

- Keep the existing type-level matrix for broad planning.
- Build the next matrix using `profileId x profileId`.
- Start with `core` profiles only; add `edge` then `stress` later.
- Each non-diagonal cell in the future profile matrix should include:
  - one selected profile pair (`leftProfileId`, `rightProfileId`)
  - one concrete satisfying example sequence/trace.

## Starter Profiles (One Core Profile Per Predicate Type)

| Predicate Type | Profile ID | Status | Params | Coverage | Minimal Satisfier |
| --- | --- | --- | --- | --- | --- |
| `total_equals` | `TOTAL_EQUALS_V1` | implemented | `{ value: 1 }` | core | `R:[1]` |
| `total_at_least` | `TOTAL_AT_LEAST_V1` | implemented | `{ value: 1 }` | core | `R:[0,1]` |
| `total_at_most` | `TOTAL_AT_MOST_V1` | implemented | `{ value: 0 }` | core | `R:[0]` |
| `total_magnitude_at_least` | `TOTAL_MAG_AT_LEAST_V1` | implemented | `{ value: 1 }` | core | `R:[-1]` |
| `roll_ends_with_sequence` | `ROLL_ENDS_SEQ_V1` | implemented | `{ sequence: [1,2] }` | core | `R:[1,2]` |
| `roll_contains_value` | `ROLL_CONTAINS_VALUE_V1` | implemented | `{ value: 1 }` | core | `R:[0,1]` |
| `roll_contains_domain_type` | `ROLL_CONTAINS_DOMAIN_RATIONAL_NON_INT_V1` | implemented | `{ domainType: "rational_non_integer" }` | core | `R:[0,1/2]` |
| `operation_equals` | `OP_EQUALS_ADD1_V1` | implemented | `{ slots: [{ operator: "+", operand: 1 }] }` | core | `A:[slots=[+1]]` |
| `operation_first_euclid_equivalent_modulo` | `OP_FIRST_EUCLID_EQ_MOD_V1` | implemented | `{}` | core | `A:[first_op=#,operand=2]` |
| `roll_length_at_least` | `ROLL_LEN_AT_LEAST_2_V1` | implemented | `{ length: 2 }` | core | `R:[0,1]` |
| `completed_unlock_id_seen` | `COMPLETED_UNLOCK_SEEN_V1` | implemented | `{ unlockId: "unlock_X" }` | core | `A:[complete_unlock=unlock_X]` |
| `roll_cycle_period_at_least` | `CYCLE_PERIOD_AT_LEAST_2_V1` | implemented | `{ length: 2 }` | core | `R:[1,2,1,2]` |
| `roll_cycle_transient_at_least` | `CYCLE_TRANSIENT_AT_LEAST_2_V1` | implemented | `{ length: 2 }` | core | `R:[0,1,2,1,2]` |
| `roll_cycle_diameter_at_least` | `CYCLE_DIAMETER_AT_LEAST_2_V1` | implemented | `{ diameter: 2 }` | core | `R:[1,3,1,3]` |
| `roll_tail_powers_of_two_run` | `TAIL_POW2_LEN2_V1` | implemented | `{ length: 2 }` | core | `R:[1,2]` |
| `roll_ends_with_equal_run` | `ENDS_EQUAL_RUN_LEN2_V1` | implemented | `{ length: 2 }` | core | `R:[1,1]` |
| `roll_ends_with_incrementing_run` | `ENDS_INC_RUN_LEN2_STEP1_V1` | implemented | `{ length: 2, step: 1 }` | core | `R:[1,2]` |
| `roll_ends_with_alternating_sign_constant_abs_run` | `ENDS_ALT_SIGN_CONST_ABS_LEN2_V1` | implemented | `{ length: 2 }` | core | `R:[1,-1]` |
| `roll_ends_with_constant_step_run` | `ENDS_CONST_STEP_LEN2_STEP2_V1` | implemented | `{ length: 2, minAbsStep: 2 }` | core | `R:[1,3]` |
| `roll_ends_with_growth_order_run` | `ENDS_GROWTH_LINEAR_LEN2_V1` | implemented | `{ order: "linear", length: 2 }` | core | `R:[1,2,3]` |
| `roll_cycle_is_opposite_pair` | `CYCLE_OPPOSITE_PAIR_V1` | implemented | `{}` | core | `R:[1,-1,1,-1]` |
| `key_press_count_at_least` | `KEY_PRESS_COUNT_DIGIT1_2_V1` | implemented | `{ key: "digit_1", count: 2 }` | core | `A:[press digit_1 x2]` |
| `overflow_error_seen` | `OVERFLOW_SEEN_V1` | implemented | `{}` | core | `A:[trigger overflow once]` |
| `division_by_zero_error_seen` | `DIV0_SEEN_V1` | implemented | `{}` | core | `A:[execute /0 once]` |
| `symbolic_error_seen` | `SYMBOLIC_ERROR_SEEN_V1` | implemented | `{}` | core | `A:[symbolic result once]` |
| `any_error_seen` | `ANY_ERROR_SEEN_V1` | implemented | `{}` | core | `A:[trigger any error once]` |
| `keys_unlocked_all` | `KEYS_UNLOCKED_ALL_BASIC_V1` | implemented | `{ keys: ["digit_1","op_add"] }` | core | `A:[unlock keys {digit_1,op_add}]` |
| `allocator_return_press_count_at_least` | `ALLOC_RETURN_COUNT_2_V1` | implemented | `{ count: 2 }` | core | `A:[press allocator_return x2]` |
| `allocator_allocate_press_count_at_least` | `ALLOC_ALLOCATE_COUNT_2_V1` | implemented | `{ count: 2 }` | core | `A:[press allocator_allocate x2]` |
| `keypad_key_slots_at_least` | `KEYPAD_SLOTS_AT_LEAST_2_V1` | implemented | `{ slots: 2 }` | core | `A:[keypad slots=2]` |
| `lambda_spent_points_dropped_to_zero_seen` | `LAMBDA_SPENT_DROP_ZERO_V1` | implemented | `{}` | core | `A:[lambda spent 1->0]` |
| `roll_ends_with_equal_length_jumps` | `EQUAL_JUMPS_LEN2_MAG2_V1` | proposed | `{ length: 2, jumpMagnitude: 2 }` | core | `R:[0,2,4]` |
| `roll_ends_with_quadrant_hop_sequence` | `QUADRANT_HOP_SEQ_V1` | proposed | `{ sequence: ["QI","QII","QIV","QIII"] }` | core | `R:[1+i,-1+i,1-i,-1-i]` |
| `theta_equals` | `THETA_EQUALS_PI4_V1` | proposed | `{ theta: "pi/4" }` | core | `R:[1+i]` |
| `roll_ends_with_equal_length_rotations` | `EQUAL_ROTATIONS_LEN4_PI2_V1` | proposed | `{ length: 4, deltaTheta: "pi/2" }` | core | `R:[1,i,-1,-i]` |
| `rational_smaller_than` | `RATIONAL_SMALLER_THAN_1_V1` | proposed | `{ value: 1, scope: "latest_total" }` | core | `R:[1/2]` |
| `roll_ends_with_equal_denominators` | `EQUAL_DENOMS_LEN2_DEN2_V1` | proposed | `{ length: 2, denominator: 2 }` | core | `R:[1/2,3/2]` |

## Notes

- Proposed predicate profiles follow current planning assumptions and may need updates when canonical predicate contracts are formalized.
- For matrix expansion, prefer adding new profiles under existing predicate types rather than creating ad hoc per-cell parameterizations.
