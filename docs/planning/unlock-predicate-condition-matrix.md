Truth: 2
# Unlock Predicate Condition Matrix

Purpose: planning scaffold for unlock-hint design and predicate cleanup. This is a predicate-type matrix (not per-unlock row) and intentionally does not list unlock effects/targets.

Canonical sources:
- Implemented predicate analyzers: `src/domain/unlockEngine.ts` (`analyzers` map).
- Active unlock catalog usage: `src/content/unlocks.catalog.ts` (predicate `type` values).
- Hint telegraph pipeline: `src/domain/unlockHintProgress.ts` + `src/ui/shared/readModel.total.ts` + `src/ui/modules/calculator/totalDisplay.ts`.

Current telegraph behavior summary:
- If a predicate type is used in catalog and mapped in hint progress, it can be surfaced via the total-display hint strip as a progress fraction plus predicate type token (for the top candidate in each category: `OP`, `KEY`, `CALC`, `LAMBDA`).
- Predicate types not used by the current catalog have no player-facing telegraph path today.

Sort key used below:
- `Multi-roll-row`: predicate can inspect roll history/patterns across multiple roll entries.
- `Single-event/snapshot`: predicate evaluates a single latched event, counter/snapshot, or current-state condition.

| Predicate Type | Scope Class | Currently In Use | Current Telegraphing |
| --- | --- | --- | --- |
| `any_error_seen` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `division_by_zero_error_seen` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `overflow_error_seen` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_contains_domain_type` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `roll_contains_value` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_cycle_diameter_at_least` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (binary progress mode). |
| `roll_cycle_is_opposite_pair` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (binary progress mode). |
| `roll_cycle_period_at_least` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (binary progress mode). |
| `roll_cycle_transient_at_least` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (binary progress mode). |
| `roll_ends_with_alternating_sign_constant_abs_run` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_ends_with_constant_step_run` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `roll_ends_with_equal_run` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_ends_with_growth_order_run` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `roll_ends_with_incrementing_run` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_ends_with_sequence` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `roll_length_at_least` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `roll_tail_powers_of_two_run` | Multi-roll-row | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `symbolic_error_seen` | Multi-roll-row | No | None (not represented in current unlock-hint projection/catalog). |
| `allocator_allocate_press_count_at_least` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `allocator_return_press_count_at_least` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `completed_unlock_id_seen` | Single-event/snapshot | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `key_press_count_at_least` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `keypad_key_slots_at_least` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `keys_unlocked_all` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `lambda_spent_points_dropped_to_zero_seen` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `operation_equals` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `operation_first_euclid_equivalent_modulo` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `total_at_least` | Single-event/snapshot | Yes | Total hint strip via unlock-hint projection (partial progress mode). |
| `total_at_most` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `total_equals` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
| `total_magnitude_at_least` | Single-event/snapshot | No | None (not represented in current unlock-hint projection/catalog). |
