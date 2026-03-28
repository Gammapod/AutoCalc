Truth 2: Releases

# Release v0.9.28: Storage Drawer Replacement

### User Story
As a player, I can quickly find and deploy unlocked keys from storage without searching or deep menu traversal.

### Dependencies
- Requires v0.9.7 unified settings-state contract to classify and render settings/visualizer key states consistently inside the drawer.

### Pre-work
Finalize drawer information architecture, including family grouping, filter strategy, and one-step deployment interactions for unlocked keys.

### Pre-work Exit Criteria
- Drawer taxonomy is defined using existing key categories (including unified settings family behavior from v0.9.7).
- Navigation flow is specified with deterministic interaction behavior for keyboard/pointer/touch.
- Performance and layout constraints are set for no-scroll operation in normal gameplay key counts.

### User Story Exit Criteria
- Players can locate a desired key within two interactions (tabs/filters/deploy) without search.
- Family-based browsing makes nearby relevant keys discoverable without exact key-name recall.
- Drawer avoids scrolling in normal gameplay inventory sizes.
- Storage interactions preserve lock/unlock correctness (`storage shows all-and-only unlocked keys`) with storage membership derived from unlock state.
- Dragging to/from storage does not change storage membership.
- Install policy is per-calculator key-ID uniqueness (duplicate install rejected on the same calculator).
- Dropping a storage key on an occupied keypad slot replaces the destination key.
- Keys can be uninstalled by dragging them off the calculator surface.
- Uninstall can remove any key (including `exec_equals`).

### Release Notes
- Release Note ID: `release_v0_9_28`
- Player-facing summary: Replaces storage browsing with a faster drawer flow for finding and deploying unlocked keys.
- Highlights:
- Key discovery emphasizes families and quick retrieval.
- Storage interactions target low-click, no-scroll access patterns with palette-style unlocked-key browsing.

# Release vα.0.0: Content Backlog

Purpose: track implementable, self-contained features that do not require Planned Release framing.

## Operators
When implementing, every operator key MUST have all of the following defined:
- functionality
- key face
- operator slot face
- expanded form

### Unary Operators
All unary operators are applied to the previous step's result.

- `Distinct prime factors`: 
    - functionality: return the number of distinct prime factors of operand.
    - key face: `ω`
    - operator slot face: `[ ω ]`
    - expanded form: ``
- `Floor`:
    - functionality: return greatest integer less than or equal to `n`.
    - key face: `⌊n⌋`
    - operator slot face: `[ ⌊n⌋ ]`
    - expanded form: ``
- `Ceiling`:
    - functionality: return least integer greater than or equal to `n`.
    - key face: `⌈n⌉`
    - operator slot face: `[ ⌈n⌉ ]`
    - expanded form: ``
- `Not`:
    - functionality: returns 1 if operand is == 0, else 0.
    - key face: `¬`
    - operator slot face: `[ ¬ ]`
    - expanded form: `[ 0 ? 1 : 0 ]`

The following require integer inputs, and return NaN otherwise:
- `Collatz`:
    - functionality: `n -> n / 2` when `n` is even; `n -> 3n + 1` when `n` is odd.
    - key face: `Ctz`
    - operator slot face: `[ Ctz ]`
    - expanded form: `[ n◇2¬ ? 3n+1 : n÷2 ]`
- `Sort asc`:
    - functionality: reorder decimal digits of `n` in ascending order.
    - key face: `⇡d`
    - operator slot face: `[ ⇡ ]`
    - expanded form: `[ sort_asc() ]`
- `Digit count (digit)`:
    - functionality: return the count of decimal digits in `n`.
    - key face: ``
    - operator slot face: `[  ]`
    - expanded form: `[  ]`
- `Digit sum`:
    - functionality: return the sum of decimal digits in `n`.
    - key face: ``
    - operator slot face: `[  ]`
    - expanded form: `[ d#1 + d#2 + {as many digits in number} ]`
- `Digit^2 sum (∑d^2)`:
    - functionality: return the sum of squared decimal digits in `n`.
    - key face: ``
    - operator slot face: `[  ]`
    - expanded form: `[ (d#1^2) + (d#2^2) + {as many digits in number} ]`
- `Mirror digits (⇋d)`:
    - functionality: reverse decimal digit order of `n`.
    - key face: ``
    - operator slot face: `[ ⇋ ]`
    - expanded form: `[ abc -> cba ]`

### Binary Operators

- `Max (╧)`:
    - functionality: return the larger of two operands.
    - key face: ``
    - operator slot face: `[ ╧ _ ]`
    - expanded form: `[ a > b ] [ × a ] + [ a > b ] [ × b ] [ ¬ ]`
- `Min (╤)`:
    - functionality: return the smaller of two operands.
    - key face: ``
    - operator slot face: `[ ╤ _ ]`
    - expanded form: `[ a > b ] [ × b ] + [ a > b ] [ × a ] [ ¬ ]`
- `Greater (>)`:
    - functionality: returns 1 if first operand is larger than the second, else 0.
    - key face: ``
    - operator slot face: `[ > _ ]`
    - expanded form: `[  ]`

The following require integer inputs, and return NaN otherwise:
- `Digit number (d#)`:
    - functionality: return the nth digit of the operand.
    - key face: ``
    - operator slot face: `[ d#_ ]`
    - expanded form: `[   ]`
- `Keep leftmost n (⪻d)`:
    - functionality: keep only the leftmost `n` digits; discard the rest.
    - key face: ``
    - operator slot face: `[  ]`
    - expanded form: `[  ]`
- `Previous roll item (f(x-k))`:
    - functionality: for current roll index `x`, return item value at relative offset `x-k`.
    - key face: ``
    - operator slot face: `[  ]`
    - expanded form: `[  ]`

## Settings Keys

- `Base-2 display`: Changes to binary notation. Please note - binary notation should also influence the behavior with respect to maxDigits and digit-specific operations. If maxDigits is set to 4, then the highest number possible is "1111", or 15 on the roll.

## Digits/Values

- `Previous result (f_x-1)`: for current roll index `x`, return the previous item value `f_x-1`.
- `Roll index (X)`: returns the index of the previous roll result +1.

## Visualizer changes

- `Function display`: Prime factorization visualizer should display the user-defined function expanded - if the user's function is `5 [ - 4 ] [ Ω ] [ × 8 ] [ ^ 2 ] [ ++ ]`, the visualizer should show `f_0 = 5, f_x = ++(( Ω(f_x-1 - 4) × 8) ^ 2)`. Binary operations are added to the right and unary operators are added to the left, parentheses as needed.

# Post-vα.0.0: full version backlog

## Unary Operators

- `Nth Prime (ℙ)`:
    - functionality: return the nth prime number. NaN if n is not a natural number.
    - key face: ``
    - operator slot face: `[ ℙ ]`
    - expanded form: `[ ℙ(n) ]`
- `Index of prime (ℙ⁻¹)`:
    - functionality: return the index of prime p. NaN if p is not a prime.
    - key face: ``
    - operator slot face: `[ ℙ⁻¹ ]`
    - expanded form: `[  ]`
    
## Settings Keys

- `Base-Prime (ℙ(ℙ⁻¹(f)))`: Allows arithmetic on the prime index. When toggled, the seed f_0=s becomes f_0=ℙ(s) and the function f_n=g°f_-n becomes ℙ(g°ℙ⁻¹(f_-n)).

## Visualizer changes

- `Prime domain`: In addition to natural numbers, integers, rationals, etc, I'd like to also label prime numbers as being in the prime domain, `ℙ`. It is a subdomain of the naturals.


