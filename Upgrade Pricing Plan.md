## Early Flow (Current Runtime)

1. At boot, only `+` is usable.
2. First `+` press auto-unlocks digit `1`.
3. Reaching main-display `Err` (`operand1Error`) auto-unlocks `C`.
4. Reaching operand2 `Err` (`operand2Error`) auto-unlocks `CE`.
5. First time main display reaches exactly `99`, `-` auto-unlocks.
6. First `CE` press auto-unlocks `=`.
7. First `-` press reveals Subtraction Store.
8. First `/` press reveals Remainder Reserve.
9. Store progression is executed by subtraction + equals (details below).

## Purchase Trigger Semantics (Current Runtime)

A purchase attempt only happens when all of the following are true:

1. Current action is `PRESS_KEY` with key `=`.
2. Previous calculator pending operator was `-`.
3. Reduced state has no `operand1Error` and no `operand2Error`.

Then:

1. Read subtraction amount from previous state's `calculator.entry` (`""` treated as `0`).
2. If amount is `<= 0`, no purchase.
3. Find first store item whose `price === amount`.
4. If item is already purchased, no change.
5. Otherwise apply item effect immediately.

## Hard Invariants (Current Runtime)

1. All store prices are positive (`BigInt` literals).
2. Item matching is exact-price equality (no ranges/fuzzy matching).
3. Item matching is first-match in `STORE_ITEMS` order.
4. Purchase executes only through subtraction-equals path.
5. Error states block purchase execution.
6. `display_cap` increments shared `displayDigits` by +1 per purchase up to max 12.
7. Store list visibility is filtered by:
   - price <= `10^displayDigits - 1`
   - all digits in price text currently unlocked

## All Unlockables

| Unlockable | Category | Unlock Type | Unlock Trigger | Price |
| ---------- | -------- | ----------- | -------------- | ----- |
| `+` | operator | `Conditional` | default unlocked at boot | n/a |
| `1` | digit | `Conditional` | first `+` press | n/a |
| `C` | utility | `Conditional` | first transition to `operand1Error` | n/a |
| `CE` | utility | `Conditional` | first transition to `operand2Error` | n/a |
| `-` | operator | `Conditional` | first time main display becomes `99` | n/a |
| `=` | operator | `Conditional` | first `CE` press | n/a |
| `Subtraction Store` panel | feature | `Conditional` | first `-` press (`storeRevealed`) | n/a |
| `Remainder Reserve` panel | feature | `Conditional` | first `/` press (`remainderReserveRevealed`) | n/a |
| `digit_9` (`9`) | digit | `Subtraction` | subtraction amount matches item price | `1` |
| `display_cap` (`displayDigits +1`) | display cap | `Subtraction` | subtraction amount matches item price | `9` |
| `digit_0` (`0`) | digit | `Subtraction` | subtraction amount matches item price | `10` |
| `digit_2` (`2`) | digit | `Subtraction` | subtraction amount matches item price | `12` |
| `digit_3` (`3`) | digit | `Subtraction` | subtraction amount matches item price | `13` |
| `digit_4` (`4`) | digit | `Subtraction` | subtraction amount matches item price | `14` |
| `digit_5` (`5`) | digit | `Subtraction` | subtraction amount matches item price | `15` |
| `digit_6` (`6`) | digit | `Subtraction` | subtraction amount matches item price | `16` |
| `digit_7` (`7`) | digit | `Subtraction` | subtraction amount matches item price | `17` |
| `digit_8` (`8`) | digit | `Subtraction` | subtraction amount matches item price | `18` |
| `op_mul` (`*`) | operator | `Remainder` | subtraction amount matches item price | `25` |
| `op_div` (`/`) | operator | `Subtraction` | subtraction amount matches item price | `91` |

Notes:

- Unlock type enum for docs is now: `Subtraction`, `Remainder`, `Conditional`.

## Validation Checklist for Future Price Changes

1. Keep all prices positive and unique.
2. Verify progression cannot deadlock due to visibility/typeability filters.
3. Ensure at least one reachable visible item exists after store reveal.
4. Re-check first-match behavior if introducing duplicate prices.
5. Ensure any new cap or operator item remains reachable under current unlock ordering.
