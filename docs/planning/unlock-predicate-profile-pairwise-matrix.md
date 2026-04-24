# Unlock Predicate Profile Pairwise Matrix (Scaffold)

Purpose: provide a profile-level pairwise matrix (`profileId x profileId`) for planning combined predicate satisfiers.

Source catalog: `docs/planning/unlock-predicate-profile-catalog.md`

Legend:
- Diagonal cells are prefilled with `SELF:` plus the profile's minimal satisfier example from the catalog.
- Non-diagonal cells are `TODO` and should be replaced with one combined satisfier that meets both profile predicates.
- When filling `TODO`, use a sequence/trace that is more complex than each related diagonal example.

## Profile Index

| Id | Profile ID | Predicate Type | Status | Diagonal Satisfier |
| --- | --- | --- | --- | --- |
| R01 | `TOTAL_EQUALS_V1` | `total_equals` | implemented | `R:[1]` |
| R02 | `TOTAL_AT_LEAST_V1` | `total_at_least` | implemented | `R:[0,1]` |
| R03 | `TOTAL_AT_MOST_V1` | `total_at_most` | implemented | `R:[0]` |
| R04 | `TOTAL_MAG_AT_LEAST_V1` | `total_magnitude_at_least` | implemented | `R:[-1]` |
| R05 | `ROLL_ENDS_SEQ_V1` | `roll_ends_with_sequence` | implemented | `R:[1,2]` |
| R06 | `ROLL_CONTAINS_VALUE_V1` | `roll_contains_value` | implemented | `R:[0,1]` |
| R07 | `ROLL_CONTAINS_DOMAIN_RATIONAL_NON_INT_V1` | `roll_contains_domain_type` | implemented | `R:[0,1/2]` |
| R08 | `OP_EQUALS_ADD1_V1` | `operation_equals` | implemented | `A:[slots=[+1]]` |
| R09 | `OP_FIRST_EUCLID_EQ_MOD_V1` | `operation_first_euclid_equivalent_modulo` | implemented | `A:[first_op=#,operand=2]` |
| R10 | `ROLL_LEN_AT_LEAST_2_V1` | `roll_length_at_least` | implemented | `R:[0,1]` |
| R11 | `COMPLETED_UNLOCK_SEEN_V1` | `completed_unlock_id_seen` | implemented | `A:[complete_unlock=unlock_X]` |
| R12 | `CYCLE_PERIOD_AT_LEAST_2_V1` | `roll_cycle_period_at_least` | implemented | `R:[1,2,1,2]` |
| R13 | `CYCLE_TRANSIENT_AT_LEAST_2_V1` | `roll_cycle_transient_at_least` | implemented | `R:[0,1,2,1,2]` |
| R14 | `CYCLE_DIAMETER_AT_LEAST_2_V1` | `roll_cycle_diameter_at_least` | implemented | `R:[1,3,1,3]` |
| R15 | `TAIL_POW2_LEN2_V1` | `roll_tail_powers_of_two_run` | implemented | `R:[1,2]` |
| R16 | `ENDS_EQUAL_RUN_LEN2_V1` | `roll_ends_with_equal_run` | implemented | `R:[1,1]` |
| R17 | `ENDS_INC_RUN_LEN2_STEP1_V1` | `roll_ends_with_incrementing_run` | implemented | `R:[1,2]` |
| R18 | `ENDS_ALT_SIGN_CONST_ABS_LEN2_V1` | `roll_ends_with_alternating_sign_constant_abs_run` | implemented | `R:[1,-1]` |
| R19 | `ENDS_CONST_STEP_LEN2_STEP2_V1` | `roll_ends_with_constant_step_run` | implemented | `R:[1,3]` |
| R20 | `ENDS_GROWTH_LINEAR_LEN2_V1` | `roll_ends_with_growth_order_run` | implemented | `R:[1,2,3]` |
| R21 | `CYCLE_OPPOSITE_PAIR_V1` | `roll_cycle_is_opposite_pair` | implemented | `R:[1,-1,1,-1]` |
| R22 | `KEY_PRESS_COUNT_DIGIT1_2_V1` | `key_press_count_at_least` | implemented | `A:[press digit_1 x2]` |
| R23 | `OVERFLOW_SEEN_V1` | `overflow_error_seen` | implemented | `A:[trigger overflow once]` |
| R24 | `DIV0_SEEN_V1` | `division_by_zero_error_seen` | implemented | `A:[execute /0 once]` |
| R25 | `SYMBOLIC_ERROR_SEEN_V1` | `symbolic_error_seen` | implemented | `A:[symbolic result once]` |
| R26 | `ANY_ERROR_SEEN_V1` | `any_error_seen` | implemented | `A:[trigger any error once]` |
| R27 | `KEYS_UNLOCKED_ALL_BASIC_V1` | `keys_unlocked_all` | implemented | `A:[unlock keys {digit_1,op_add}]` |
| R28 | `ALLOC_RETURN_COUNT_2_V1` | `allocator_return_press_count_at_least` | implemented | `A:[press allocator_return x2]` |
| R29 | `ALLOC_ALLOCATE_COUNT_2_V1` | `allocator_allocate_press_count_at_least` | implemented | `A:[press allocator_allocate x2]` |
| R30 | `KEYPAD_SLOTS_AT_LEAST_2_V1` | `keypad_key_slots_at_least` | implemented | `A:[keypad slots=2]` |
| R31 | `LAMBDA_SPENT_DROP_ZERO_V1` | `lambda_spent_points_dropped_to_zero_seen` | implemented | `A:[lambda spent 1->0]` |
| R32 | `EQUAL_JUMPS_LEN2_MAG2_V1` | `roll_ends_with_equal_length_jumps` | proposed | `R:[0,2,4]` |
| R33 | `QUADRANT_HOP_SEQ_V1` | `roll_ends_with_quadrant_hop_sequence` | proposed | `R:[1+i,-1+i,1-i,-1-i]` |
| R34 | `THETA_EQUALS_PI4_V1` | `theta_equals` | proposed | `R:[1+i]` |
| R35 | `EQUAL_ROTATIONS_LEN4_PI2_V1` | `roll_ends_with_equal_length_rotations` | proposed | `R:[1,i,-1,-i]` |
| R36 | `RATIONAL_SMALLER_THAN_1_V1` | `rational_smaller_than` | proposed | `R:[1/2]` |
| R37 | `EQUAL_DENOMS_LEN2_DEN2_V1` | `roll_ends_with_equal_denominators` | proposed | `R:[1/2,3/2]` |

## Pairwise Matrix

| Id | R01 | R02 | R03 | R04 | R05 | R06 | R07 | R08 | R09 | R10 | R11 | R12 | R13 | R14 | R15 | R16 | R17 | R18 | R19 | R20 | R21 | R22 | R23 | R24 | R25 | R26 | R27 | R28 | R29 | R30 | R31 | R32 | R33 | R34 | R35 | R36 | R37 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | SELF:R:[1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R02 | TODO | SELF:R:[0,1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R03 | TODO | TODO | SELF:R:[0] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R04 | TODO | TODO | TODO | SELF:R:[-1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R05 | TODO | TODO | TODO | TODO | SELF:R:[1,2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R06 | TODO | TODO | TODO | TODO | TODO | SELF:R:[0,1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R07 | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[0,1/2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R08 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[slots=[+1]] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R09 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[first_op=#,operand=2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R10 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[0,1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R11 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[complete_unlock=unlock_X] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R12 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,2,1,2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R13 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[0,1,2,1,2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R14 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,3,1,3] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R15 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R16 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R17 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R18 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,-1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R19 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,3] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R20 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,2,3] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R21 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,-1,1,-1] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R22 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[press digit_1 x2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R23 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[trigger overflow once] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R24 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[execute /0 once] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R25 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[symbolic result once] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R26 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[trigger any error once] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R27 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[unlock keys {digit_1,op_add}] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R28 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[press allocator_return x2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R29 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[press allocator_allocate x2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R30 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[keypad slots=2] | TODO | TODO | TODO | TODO | TODO | TODO | TODO |
| R31 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:A:[lambda spent 1->0] | TODO | TODO | TODO | TODO | TODO | TODO |
| R32 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[0,2,4] | TODO | TODO | TODO | TODO | TODO |
| R33 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1+i,-1+i,1-i,-1-i] | TODO | TODO | TODO | TODO |
| R34 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1+i] | TODO | TODO | TODO |
| R35 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1,i,-1,-i] | TODO | TODO |
| R36 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1/2] | TODO |
| R37 | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | SELF:R:[1/2,3/2] |

## Fill Contract (For Next Pass)

- Replace each `TODO` with exactly one `R:[...]` or `A:[...]` combined satisfier.
- Include both profile IDs in a short annotation, e.g. `R:[...]; pair=(R03,R17)`.
- Prefer shortest deterministic satisfier that is strictly more complex than both involved diagonal examples.
- Keep diagonal `SELF:` cells unchanged unless the source profile catalog changes.
