Truth 2: Releases

# Release v0.9.1: Main Menu + Session Control Surface

### User Story
As a player, I can start from a dedicated Main Menu mode and choose `Continue`, `New Game`, `Sandbox`, or `Quit Game`, with system/game control keys available from gameplay.

### Pre-work
Finalize allocator/menu calculator constants and default key placements referenced by allocator planning.

### Pre-work Exit Criteria
- Menu calculator baseline constants and keypad layout are frozen.
- Initial game-state calculator `f` key placement is frozen:
- `#0 Save&Quit`, `#1 blank`, `#2 blank`, `#3 blank`, `#4 unary_inc`, `#5 exec_equals`.

### User Story Exit Criteria
- New `main_menu` mode exists as a peer to `game` and `sandbox`.
- Initial app state starts in Main Menu with `menu` calculator visible/unlocked and `f`/`g` locked.
- Menu calculator includes Menu visualizer with version text `v*.*.*` (top-left) and `AutoCalc` center title.
- Global system/game control family exists with:
- `Continue`, `New Game`, `Sandbox`, `Save&Quit`, `Quit Game`.
- `Save&Quit` saves and returns to Main Menu.
- `Continue` loads save and transitions into normal game mode flow.

# Release v0.9.2: Calculator G + Unlock/Lambda Trigger Expansion

### User Story
As a progressing player, I unlock calculator `g` and new keys/visualizers through concrete gameplay milestones, and both calculators receive lambda rewards from defined trigger events.

### Pre-work
Confirm all new unlock predicates and one-time reward conditions are representable in the predicate/unlock system without TODO-capability placeholders.

### Pre-work Exit Criteria
- Predicate catalog and unlock wiring support all listed conditions with concrete metadata.
- Debug-unlock path is confirmed to reveal calculator `g` consistently with normal unlock flow.

### User Story Exit Criteria
- New unlock conditions are implemented:
- `memory_adjust_plus`: first lambda point awarded.
- `memory_cycle_variable`: first lambda point spent.
- `viz_eigen_allocator`: first lambda point refunded.
- `viz_feed`: first roll length > 20.
- `exec_play_pause`: first roll length > 40.
- `util_backspace`: first `C` that clears a function with 2 filled operation slots.
- `util_undo`: first NaN result.
- `exec_roll_inverse`: first undo used while feed visualizer is displayed.
- `op_mod`: first cycle with length > 2.
- `toggle_mod_zero_to_delta`: first overflow in base-2 mode.
- `calculator g`: first run of 7 containing only powers of 2.
- Calculator `g` appears immediately when unlocked, including debug unlock.
- Calculator `g` initial keypad layout is applied:
- `R2C2 toggle_binary_mode`, `R2C1 exec_step_through`, `R1C1 unary_not`; all keys still locked by default state.
- Lambda-point one-time awards for calculator `f`:
- first transient with length > 10, first cycle diameter > 10, first cycle length > 5.
- Lambda-point one-time awards for calculator `g`:
- first addition in base-2 mode yielding result 1, first multiplication in base-2 mode yielding result 0.
- Unlock and one-time reward state persists across save/load.

# Release v0.9.3: Key Family Taxonomy + Visual Identity Pass

### User Story
As a player, I can visually parse key roles faster through consistent key-family styling and subgroup striping.

### Pre-work
Freeze color tokens and settings subgroup mapping for visualizer/settings integration.

### Pre-work Exit Criteria
- Canonical token names exist for settings base color and subgroup stripe/text colors.
- Mutual-exclusion subgroup mapping is finalized for visualizers, mod/wrap, `[ ??? ]`, and base-2.

### User Story Exit Criteria
- Visualizers and settings keys are unified into one `settings` key family.
- Settings keys use darker-blue base color and bottom stripe styling.
- Settings subgroup stripe/text colors are applied:
- visualizers: light blue; mod/wrap settings: yellow; `[ ??? ]`: purple; base-2: orange.
- Binary operators render a right-edge stripe instead of bottom stripe.
- No key behavior changes are introduced in this release.

# Release v0.9.4: Unlock Proximity Radar (Hint System v1)

### User Story
As a player, I get near-unlock feedback on the default visualizer without revealing exact unlock condition text.

### Pre-work
Extend unlock evaluation to emit partial-progress output for multi-row conditions.

### Pre-work Exit Criteria
- Unlock engine can produce normalized progress for rolling-window predicates (for example, last N rows).
- Partial-match output is available without changing unlock truth semantics.

### User Story Exit Criteria
- Default visualizer includes a proximity indicator that fills proportionally to strongest active near-match.
- Partial success is supported for relevant multi-row unlock conditions.
- Indicator communicates proximity only and does not disclose full unlock condition text.
- Scope is limited to default visualizer; hint overlays on other visualizers are out of scope.

# Release v0.9.5: Roll Analysis Visualizer Replacement

### User Story
As a player, I can open a diagnostic visualizer showing what just happened and what the run currently indicates.

### Pre-work
Define a stable presentation schema for analysis sections and `Last Key` descriptions, including visualizer-key interaction caveats.

### Pre-work Exit Criteria
- Section contract is frozen for:
- `Last Key`, `Next Operation`, `Orbit Analysis`, `Domain`, `Prime Factorization`.
- `Last Key` copy behavior for visualizer-key interactions is resolved and documented.

### User Story Exit Criteria
- Reworked roll analysis visualizer exposes all required categories:
- Last Key: written explanation of most recent key effect.
- Next Operation: current pending operation in words with algebraic relation text.
- Orbit Analysis: transient length, transient growth order, cycle detection, and cycle diameter/range when cycle exists.
- Domain: written description of detected number domain.
- Prime Factorization: factorization of current function seed and latest row.
- Visualizer is diagnostic only and introduces no gameplay logic changes.

### Notes
- `temp_plan.md` content is considered consolidated into release entries v0.9.1-v0.9.5.

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
