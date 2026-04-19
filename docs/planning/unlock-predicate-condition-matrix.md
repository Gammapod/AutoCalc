Truth: 2

# Unlock Predicate Condition Matrix

Purpose: planning scaffold for unlock-hint design and predicate cleanup. This is a predicate-type matrix (not per-unlock row) and intentionally does not list unlock effects/targets.

Canonical sources:

* Implemented predicate analyzers: `src/domain/unlockEngine.ts` (`analyzers` map).

* Active unlock catalog usage: `src/content/unlocks.catalog.ts` (predicate `type` values).

* Hint telegraph pipeline (current placeholder): `src/domain/unlockHintProgress.ts` + `src/ui/shared/readModel.total.ts` + `src/ui/modules/calculator/totalDisplay.ts`.

Scope Class key used below:

* `Partial-detectable`: progress can be represented as an in-progress state (for example counts, run length, threshold distance, ratio of satisfied requirements).

* `Binary-only`: no meaningful partial signal; predicate is effectively observed/not-observed.

| Predicate Type                                     | Scope Class        | Currently In Use | Visualizer(s) | Telegraphing |
| -------------------------------------------------- | ------------------ | ---------------- | ------------- | ------------ |
| `any_error_seen`                                   | Partial-detectable | Yes              | TBD           | TBD          |
| `division_by_zero_error_seen`                      | Partial-detectable | No               | TBD           | TBD          |
| `overflow_error_seen`                              | Partial-detectable | No               | TBD           | TBD          |
| `roll_contains_domain_type`                        | Partial-detectable | Yes              | TBD           | TBD          |
| `roll_contains_value`                              | Partial-detectable | No               | TBD           | TBD          |
| `roll_cycle_diameter_at_least`                     | Binary-only        | Yes              | TBD           | TBD          |
| `roll_cycle_is_opposite_pair`                      | Binary-only        | Yes              | TBD           | TBD          |
| `roll_cycle_period_at_least`                       | Binary-only        | Yes              | TBD           | TBD          |
| `roll_cycle_transient_at_least`                    | Binary-only        | Yes              | TBD           | TBD          |
| `roll_ends_with_alternating_sign_constant_abs_run` | Partial-detectable | No               | TBD           | TBD          |
| `roll_ends_with_constant_step_run`                 | Partial-detectable | Yes              | TBD           | TBD          |
| `roll_ends_with_equal_run`                         | Partial-detectable | No               | TBD           | TBD          |
| `roll_ends_with_growth_order_run`                  | Partial-detectable | Yes              | TBD           | TBD          |
| `roll_ends_with_incrementing_run`                  | Partial-detectable | No               | TBD           | TBD          |
| `roll_ends_with_sequence`                          | Partial-detectable | No               | TBD           | TBD          |
| `roll_length_at_least`                             | Partial-detectable | Yes              | TBD           | TBD          |
| `roll_tail_powers_of_two_run`                      | Partial-detectable | Yes              | TBD           | TBD          |
| `symbolic_error_seen`                              | Partial-detectable | No               | TBD           | TBD          |
| `allocator_allocate_press_count_at_least`          | Partial-detectable | No               | TBD           | TBD          |
| `allocator_return_press_count_at_least`            | Partial-detectable | No               | TBD           | TBD          |
| `completed_unlock_id_seen`                         | Binary-only        | Yes              | TBD           | TBD          |
| `key_press_count_at_least`                         | Partial-detectable | No               | TBD           | TBD          |
| `keypad_key_slots_at_least`                        | Partial-detectable | No               | TBD           | TBD          |
| `keys_unlocked_all`                                | Partial-detectable | No               | TBD           | TBD          |
| `lambda_spent_points_dropped_to_zero_seen`         | Binary-only        | No               | TBD           | TBD          |
| `operation_equals`                                 | Binary-only        | No               | TBD           | TBD          |
| `operation_first_euclid_equivalent_modulo`         | Binary-only        | No               | TBD           | TBD          |
| `total_at_least`                                   | Partial-detectable | Yes              | TBD           | TBD          |
| `total_at_most`                                    | Partial-detectable | No               | TBD           | TBD          |
| `total_equals`                                     | Binary-only        | No               | TBD           | TBD          |
| `total_magnitude_at_least`                         | Partial-detectable | No               | TBD           | TBD          |
