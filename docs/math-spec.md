Truth 1: Invariants

# Math Spec

_Last updated: 2026-04-11_

## Scope

This file is the canonical spec for runtime math behavior and operator-domain policy.
Release sequencing for implementation is maintained in `docs/planning/Planned Releases.md`.

## Core invariants

1. Execution model is seed + ordered slots.
- Evaluation starts from current seed total and applies slots left-to-right.
- Unary slots consume current total.
- Binary slots consume current total as left operand and drafted slot operand as right operand.

2. Function-builder input is intentionally constrained.
- Digit atoms are `0..9`.
- Initial player-entered seed is a single digit `0..9`.
- Binary drafting currently uses `maxOperandDigits: 1` with digit-only operand entry.
- Entering another digit while operand length is max replaces existing digit.
- Constants (`pi`, `e`) are not directly player-enterable for seed/right-operand entry.
- Exact symbolic/runtime results may still contain `pi`/`e`.

3. Canonical numeric model is exact and structured.
- Rational values are exact `{ num: bigint, den: bigint }`.
- Symbolic values are exact expression trees/text; no decimal literals are introduced by runtime.
- Complex values are exact `{ kind: "complex", value: { re: ScalarValue, im: ScalarValue } }`.

4. Complex normalization is mandatory.
- Recorded roll results are stored as exact complex values, including explicit `im = 0`.
- Real-equivalence treats `a` and `a + 0i` as equal where value equality is required.
- `NaN` is top-level only (`kind: "nan"`), never embedded inside `re`/`im`.

5. Failure semantics are explicit and non-approximate.
- Division-by-zero returns `division_by_zero` and emits `n/0` roll error.
- Domain-invalid input returns `nan_input` and emits `NaN` roll error.
- Unsupported symbolic/complex operator paths return `unsupported_symbolic`; no float fallback is allowed.
- `NaN` is a terminal null-result outcome persisted in roll/history rows and is also a valid execution seed for propagation semantics.
- Runtime MUST populate roll error metadata for NaN-producing execution outcomes (reason taxonomy expansion is deferred to dedicated slices).
- Execution-category key inputs remain policy-allowed when the latest roll/history row is `NaN`; operator evaluation from NaN current total returns `NaN` and preserves NaN metadata semantics.
- Magnitude overflow is non-NaN failure: magnitude overflow clamps to finite boundary output and emits overflow metadata.
- Precision overflow is non-NaN failure: when exact representability limits are exceeded, runtime MUST emit precision-overflow metadata and project to a finite exact representable output (projection policy is deferred).
- Precision-overflow handling MUST remain exact-output only; approximate numeric values are not persisted as roll outputs.
- Inverse-power/root evaluation is exact-only: representable principal roots in the canonical algebraic basis (`1`, `sqrt(2)`, `sqrt(3)`, `sqrt(6)`) may resolve as non-NaN; non-representable roots remain ambiguous and resolve to `NaN`.

6. Approximation is branch-only and deterministic.
- Stored/returned operator values remain exact (`rational` / `expr` / `complex`); no approximate roll values are persisted.
- Ordered comparisons use exact-first evaluation; numeric approximation is only fallback for branch decisions.
- Approximate tie-band is `epsilon = 1e-12`.
- `unary_not` boundary/tie resolves as on-line (`1`).
- `op_max` / `op_min` ties resolve to the left operand.

## Gameplay and operations invariants

1. Active-roll input gating is stable.
- Digit input is blocked while roll is active.
- Operator/unary input while roll is active first clears function entry, then applies key behavior.

2. Diagnostics and roll analysis remain rational-gated.
- Incremental roll diagnostics and cycle math require rational totals.
- Any non-rational/non-scalar result path (including complex) marks roll analysis invalid for that step path.

3. Domain projection is display contract, not execution authorization.
- Complex outputs map to `ℤ(𝕀)` when Gaussian (`im != 0` and integer `re/im`), else `I(*)` for pure-imaginary and `C` for mixed complex.
- Domain display does not imply operator acceptance; operator policy table below is authoritative.

4. Complex left-operand execution is first-class.
- Unary slots accept complex operands.
- Binary slots accept complex left operands while right operand remains digit-derived.
- `x -> i*x` and repeated application composes exactly (`i^2 = -1`).

## Operator capability registry (implementation review)

Policy classes:
- `complex_total`: accepts complex running totals.
- `integer_only`: integer-domain only.
- `digit_only`: integer digit-structure semantics only.
- `ordered_real_only`: requires real-number ordering.
- `pending_policy`: unresolved policy.

| Operator | Current implementation (2026-03-31) | Proposed policy | Required change for rollout |
|---|---|---|---|
| `op_add` | Rejects once running total is complex (`unsupported_symbolic`) | `complex_total` | Implement complex addition (`(a+bi)+c` and `(a+bi)+(c+di)`) in exact scalar form. |
| `op_sub` | Rejects complex running total | `complex_total` | Implement complex subtraction in exact scalar form. |
| `op_mul` | Rejects complex running total | `complex_total` | Implement complex multiplication `(ac-bd) + (ad+bc)i`. |
| `op_div` | Rejects complex running total | `complex_total` | Implement complex division with explicit zero-denominator guard on complex denominator norm. |
| `op_pow` | Rational-only fast path with bigint exponent; symbolic path currently unsupported | `pending_policy` | Split policy: integer exponent support for complex base vs. explicit reject for non-integer exponent until branch-cut policy is frozen. |
| `op_euclid_div` | Gaussian integer quotient for complex-left with integer divisor (`q = round((a+bi)/n)` componentwise); non-Gaussian rejects by rational-only fallback policy | `complex_total` | Full Gaussian divisor input (`w in Z[i]`) is deferred; current path supports integer divisors only. |
| `op_mod` | Gaussian integer remainder for complex-left with integer divisor (`r = (a+bi) - n*q`) | `complex_total` | Full Gaussian divisor input (`w in Z[i]`) is deferred; current path supports integer divisors only. |
| `op_rotate_left` | Decimal digit rotation on integer totals | `complex_total` | For Gaussian complex-left, rotate `re` and `im` componentwise; non-Gaussian keeps non-integer reject parity. |
| `op_gcd` | Integer gcd / Gaussian norm gcd | `complex_total` | For Gaussian complex-left, apply gcd on `N(a+bi)`; non-Gaussian keeps non-integer reject parity. |
| `op_lcm` | Integer lcm / Gaussian norm lcm | `complex_total` | For Gaussian complex-left, apply lcm on `N(a+bi)`; non-Gaussian keeps non-integer reject parity. |
| `op_max` | Magnitude compare (`|left|` vs `|right|`) | `complex_total` | Accept all complex-left values; exact-first compare with approx fallback, ties choose left. |
| `op_min` | Magnitude compare (`|left|` vs `|right|`) | `complex_total` | Accept all complex-left values; exact-first compare with approx fallback, ties choose left. |
| `unary_inc` | Integer-only (`den === 1`) | `complex_total` | Generalize to exact `+1` on scalar and complex values (complex adds to real component). |
| `unary_dec` | Integer-only (`den === 1`) | `complex_total` | Generalize to exact `-1` on scalar and complex values (complex subtracts from real component). |
| `unary_neg` | Integer-only (`den === 1`) | `complex_total` | Generalize to exact multiply by `-1` for scalar and complex values. |
| `unary_i` | Supported on scalar and complex totals | `complex_total` | Keep behavior; add matrix coverage across rational/expr/complex quadrants. |
| `unary_sigma` | Integer divisor-sum; Gaussian uses norm | `complex_total` | For Gaussian complex-left, apply on `N(a+bi)`; non-Gaussian complex keeps non-integer reject parity. |
| `unary_phi` | Integer totient; Gaussian uses norm | `complex_total` | For Gaussian complex-left, apply on `N(a+bi)`; non-Gaussian complex keeps non-integer reject parity. |
| `unary_omega` | Integer prime-factor count; Gaussian uses norm | `complex_total` | For Gaussian complex-left, apply on `N(a+bi)`; non-Gaussian complex keeps non-integer reject parity. |
| `unary_not` | `re + im <= 0 ? 1 : 0` | `complex_total` | Accept all complex-left values; exact-first compare with approx fallback and tie-as-on-line (`1`). |
| `unary_collatz` | Integer-only transform | `complex_total` | For Gaussian complex-left, apply componentwise; non-Gaussian complex keeps non-integer reject parity. |
| `unary_sort_asc` | Integer digit transform | `complex_total` | For Gaussian complex-left, apply componentwise; non-Gaussian complex keeps non-integer reject parity. |
| `unary_mirror_digits` | Integer digit transform | `complex_total` | For Gaussian complex-left, apply componentwise; non-Gaussian complex keeps non-integer reject parity. |
| `unary_floor` | Componentwise floor | `complex_total` | Accept all complex-left values and floor `re`/`im` separately, including exact algebraic-basis scalar components. |
| `unary_ceil` | Componentwise ceil | `complex_total` | Accept all complex-left values and ceil `re`/`im` separately, including exact algebraic-basis scalar components. |

### Registry sync rule
- Runtime execution policy is canonicalized in `src/domain/operatorExecutionPolicy.ts`.
- Runtime execution-plan modeling is canonicalized in `src/domain/executionPlanIR.ts`.
- The table above and runtime registry must stay synchronized one-to-one for executable unary/binary operators.
- Typed IR routing does not change arithmetic semantics in this milestone; it centralizes plan representation only.
- Reducer and engine runtime execution flows are IR-first; legacy execution routing is retained only as an internal parity comparator path.
- Registry status `deferred` entries document intentionally frozen policy gaps and must not silently change runtime behavior.

## Coverage invariants for rollout

1. Every operator must have explicit expected disposition (`accept` or `reject`) for scenario set `S01..S11`.
2. Every reject must assert stable reason category aligned to policy class.
3. Quadrant coverage is required for mixed complex integer-part cases.
4. Radical scenarios (`S04`, `S08`, `S11`) are mandatory for every `complex_total` operator.

## Deferred decisions

1. `op_pow` non-integer exponent policy for complex bases (principal branch and branch-cut semantics).
2. Any future true complex-plane rotation operator remains out of scope for `op_rotate_left`.
3. Rational precision control projection wiring (`rationalPrecision`/`delta_q`, calculator-local) is deferred; current runtime applies denominator-precision projection using existing range digits.
4. Algebraic/radical precision projection remains out of scope; inverse roots outside the canonical algebraic basis remain `NaN` rather than widening symbolic runtime totals.
