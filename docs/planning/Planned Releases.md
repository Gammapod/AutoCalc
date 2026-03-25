Truth 2: Releases

TODO: For each planned release listed here, compare with temp_plan. Update each mileston with any relevant harmonizable details from temp_plan.

TODO: Compare all planned releases against temp_plan. 

# Release v0.9.0: Pre-Launch

## Stub: Main Menu

# Release v1.0.0: Content Backlog

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

# Post-v1.0.0: full version backlog

## Planned Release: Replace Checklist

Goal: remove checklist-first progression UX and replace it with contextual hints inside the calculator experience.

### Direction

- De-emphasize or remove standalone checklist panel from primary progression flow.
- Show unlock-condition hints on/near relevant calculator surfaces and controls.
- Hint style should vary by predicate type (examples: key press counts, roll sequence targets, total thresholds, error-observation goals).

### Design Constraints

- Preserve existing progression correctness in domain logic; this is a presentation/interaction shift, not a rule simplification.
- Keep hints understandable without requiring external panel scanning.
- Avoid overwhelming players; reveal only actionable or near-term hint context.

### Exit Criteria

- Checklist panel removed from active UX path.
- Predicate-to-hint mapping defined for current unlock catalog.
- UI and behavior tests updated for hint rendering and checklist removal.

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