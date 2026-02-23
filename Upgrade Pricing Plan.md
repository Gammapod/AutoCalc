# Upgrade Pricing Plan

Purpose: define hard progression constraints before assigning final upgrade prices.

Note: display digit caps are now unified; one `display_cap` upgrade increases Total, Operand 2, and Remainder displays together.

## Current Flow (Early Game)

1. Only `+` is interactable at boot; first `+` press auto-unlocks `1`.
2. Digits only affect operand 2 (never write directly into total).
3. If operand 1 overflows, `C` auto-unlocks.
4. First `C` press auto-unlocks `-`; first `-` press reveals the subtraction store.
5. First time total equals `4`, `=` auto-unlocks.
6. If operand 2 overflows, `CE` auto-unlocks.
7. First `%` press reveals Remainder Reserve.
8. After store reveal, progression depends on subtraction-typed exact prices.

## Hard Constraints (Must Always Hold)

1. Prices must be strictly positive.
2. A purchase only triggers after executing a pending subtraction (`-`) with `=`, `+`, `-`, `*`, or `/`.
3. If subtraction execution errors, no purchase is applied.
4. For `operand2Digits = d2`, price must satisfy `1 <= price <= 10^d2 - 1`.
5. Price text must be typeable using currently unlocked digits.
6. For `operand1Digits = d1`, effective one-step affordability is bounded by display capacity (`<= 10^d1 - 1`) and current display value.
7. Every progression state must expose at least one reachable unpurchased "bridge" item, or the run deadlocks.
8. Prices must be unique across store items to avoid first-match shadowing.
9. Each `operand2Digits +1` upgrade must itself be reachable in the current `d2` tier (it is the gate to the next price band).

## Tier Price Bands

- Tier `d2 = 1`: reachable prices are `1..9`
- Tier `d2 = 2`: reachable prices are `1..99`
- Tier `d2 = 3`: reachable prices are `1..999`
- Tier `d2 = n`: reachable prices are `1..(10^n - 1)`

## Planning Table (Fill In)

Use one row per item. Keep this sorted by intended unlock order.

| Item ID          | Type        | Prerequisites   | Possible Price Range     | Price |
| ---------------- | ----------- | --------------- | ------------------------ | ----- |
| operand2_cap_2   | display_cap | game start      |                          |       |
| auto_unlock_+    | auto_unlock | game start      |                          |       |
| auto_unlock_1    | auto_unlock | first `+` press |                          |       |
| auto_unlock_ce   | auto_unlock | operand overflow|                          |       |
| auto_unlock_equals| auto_unlock | first `CE` press|                         |       |
| auto_unlock_c    | auto_unlock | total overflow  |                          |       |
| auto_unlock_minus | auto_unlock | first `C` press|                          |       |
| digit_9          | digit       |                 |                          |     1 |
| display_cap_2    | display_cap | none            | 1..9                     |    99 |
| op_div           | operator    |                 |                          |    91 |
| digit_6          | digit       |                 |                          |       |
| digit_0          | digit       |                 |                          |       |
| digit_2          | digit       |                 |                          |       |
| digit_3          | digit       |                 |                          |       |
| digit_4          | digit       |                 |                          |       |
| digit_5          | digit       |                 |                          |       |
| digit_7          | digit       |                 |                          |       |
| digit_8          | digit       |                 |                          |       |
| op_mul           | operator    |                 |                          |       |
| display_cap_3    | display_cap | display_cap_2   | 10..99                   |       |
| display_cap_4    | display_cap | display_cap_3   | 100..999                 |       |
| display_cap_5    | display_cap | display_cap_4   | 1000..9999               |       |
| display_cap_6    | display_cap | display_cap_5   | 10000..99999             |       |
| display_cap_7    | display_cap | display_cap_6   | 100000..999999           |       |
| display_cap_8    | display_cap | display_cap_7   | 1000000..9999999         |       |
| display_cap_9    | display_cap | display_cap_8   | 10000000..99999999       |       |
| display_cap_10   | display_cap | display_cap_9   | 100000000..999999999     |       |
| display_cap_11   | display_cap | display_cap_10  | 1000000000..9999999999   |       |
| display_cap_12   | display_cap | display_cap_11  | 10000000000..99999999999 |       |

## Validation Checklist for Any Candidate Price Set

1. Are all prices positive and unique?
2. From initial post-store state, is there at least one reachable purchase?
3. After each planned purchase, does at least one next purchase remain reachable?
4. Do all cap-upgrade prices fit inside the current operand-2 price band?
5. Are no critical bridge prices blocked by requiring not-yet-unlocked digits?
6. Is there always a feasible path to increase both `operand1Digits` and `operand2Digits` over time?
