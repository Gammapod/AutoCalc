Truth 2: Releases

# Release v0.9.6: Unified Settings State Model

### User Story
As a player, all settings-style keys behave consistently: I can immediately tell whether a setting is locked/unlocked and toggled/untoggled, and every settings key follows the same interaction rules.

### Pre-work
Inventory and unify settings behavior currently split across lock semantics, toggle flags, read-model projections, and key visual affordances.

### Pre-work Exit Criteria
- Canonical definitions are documented for locked, unlocked, toggled, and untoggled in settings context.
- A single settings-state mapping is defined from domain flags and unlock state to UI presentation state.
- Existing exceptions (for example, play/pause lock behavior) are explicitly captured as named, testable rules.

### User Story Exit Criteria
- Settings keys and visualizer keys share one unified state vocabulary and rendering behavior across keypad and storage.
- Locked settings-toggle keys obey deterministic forced-on semantics until unlocked (per functional-spec behavior).
- Untoggled/toggled state is represented consistently (including LED stripe semantics) on all settings-family keys.
- Behavior and projection contracts cover lock/toggle transitions, forced states, and cross-surface parity.

### Release Notes
- Release Note ID: `release_v0_9_6`
- Player-facing summary: Unifies settings behavior so lock state and toggle state are consistent across keypad and storage.
- Highlights:
- Settings and visualizer controls now follow one shared interaction model.
- Lock state and toggle state now resolve through a single consistent runtime mapping.

# Release v0.9.7: Storage Drawer Replacement

### User Story
As a player, I can quickly find and deploy unlocked keys from storage without searching or deep menu traversal.

### Dependencies
- Requires v0.9.6 unified settings-state contract to classify and render settings/visualizer key states consistently inside the drawer.

### Pre-work
Finalize drawer information architecture, including family grouping, filter strategy, and one-step deployment interactions for unlocked keys.

### Pre-work Exit Criteria
- Drawer taxonomy is defined using existing key categories (including unified settings family behavior from v0.9.6).
- Navigation flow is specified with deterministic interaction behavior for keyboard/pointer/touch.
- Performance and layout constraints are set for no-scroll operation in normal gameplay key counts.

### User Story Exit Criteria
- Players can locate a desired key within two interactions (tabs/filters/deploy) without search.
- Family-based browsing makes nearby relevant keys discoverable without exact key-name recall.
- Drawer avoids scrolling in normal gameplay inventory sizes.
- Storage interactions preserve lock/unlock correctness (`storage contains unlocked keys only`) and move/swap domain constraints.

### Release Notes
- Release Note ID: `release_v0_9_7`
- Player-facing summary: Replaces storage browsing with a faster drawer flow for finding and deploying unlocked keys.
- Highlights:
- Key discovery emphasizes families and quick retrieval.
- Storage interactions target low-click, no-scroll access patterns.

# Release v0.9.8: Checklist to Visualizer Hints

### User Story
As a player, I get progression guidance directly in visualizer surfaces so I can pursue unlocks without opening a separate checklist panel.

### Dependencies
- Requires v0.9.6 unified settings/lock-toggle definitions so hint eligibility and key state messaging use one vocabulary.
- Integrates after v0.9.7 drawer IA decisions to keep hint actions and key-retrieval flows consistent.

### Pre-work
Extend unlock evaluation to emit hint-friendly progress signals per predicate type while preserving unlock truth semantics.

### Pre-work Exit Criteria
- Unlock engine emits normalized partial-progress data for multi-row and threshold predicates.
- Predicate-to-hint mapping exists for current unlock catalog with explicit non-spoiler redaction rules.
- Hint prioritization policy is defined (for example, strongest near-match and actionable next step).

### User Story Exit Criteria
- Standalone checklist panel is removed from the primary progression UX path.
- Default visualizer shows near-unlock hints that communicate progress without exposing full unlock condition text.
- Hint rendering supports multiple predicate families (press counts, roll patterns, total thresholds, error-observation conditions).
- UI and behavior tests cover hint selection, redaction rules, and checklist-surface retirement.

### Release Notes
- Release Note ID: `release_v0_9_8`
- Player-facing summary: Replaces checklist-first progression with contextual visualizer hints that show progress without spoilers.
- Highlights:
- Visualizer hints surface actionable near-unlock guidance in-context.
- Predicate-aware progress cues replace checklist scanning as the default progression loop.

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

