Truth: 4 - Operator Test Matrix

# Operator Testing Matrix

_Last updated: 2026-04-17_

Purpose: canonical living matrix for operator-domain test coverage.  
Scope: executable operator keys only (`op_*`, `unary_*`).

## Cross-Reference: Test Entry Points

- Primary runtime behavior suite: `tests/engine.test.ts` (`runEngineTests`)
- Policy coverage suite: `tests/operatorExecutionPolicyRegistry.contract.test.ts` (`runOperatorExecutionPolicyRegistryContractTests`)
- Existing inverse execution coverage: `tests/reducer.executionIRRoutingParity.test.ts`
- Matrix contract suite: `tests/operatorTestingMatrix.contract.test.ts` (`runOperatorTestingMatrixContractTests`)
- Runner currently in active CI health path: `tests/run-tests.ts` (does not yet include the two suites above)
- Runner group name: `contracts/operator-testing-matrix`

## Canonical Scenario IDs

Binary baseline scenarios (operand `b = 2` unless noted):
- `B-F`: seed `a = 5/2` (fractional first operand)
- `B-Z`: seed `a = 0`
- `B-O`: seed `a = 1`
- `B-S1`: `a = 2`, `b = 3`
- `B-S2`: `a = 3`, `b = 2`

Complex scenarios (binary uses `b = 3`; unary uses seed only):
- `C-IM`: `0 + 2i`
- `C-Q1`: `3 + 4i`
- `C-NQ1`: `-3 + 4i`
- `C-FR`: `3/2 + 5/4 i`

Radical/expression scenarios:
- `R-NUM`: seed `sqrt(2)` (numerator radical)
- `R-DEN`: seed `1/sqrt(2)` (denominator radical)

Algebraic-basis scenarios (runtime canonical irrational domain):
- `A-SQRT2`: seed `sqrt(2)` as algebraic basis coefficient (`sqrt2 = 1`)
- `A-SQRT3`: seed `sqrt(3)` as algebraic basis coefficient (`sqrt3 = 1`)
- `A-MIX`: seed `-1/2 + sqrt(3)` (algebraic basis mix for floor/ceil component tests)

NaN scenario:
- `N-SEED`: seed `NaN`

Inverse scenario:
- `I-01`: `exec_roll_inverse` + `exec_step_through` on an operator slot that is marked invertible in this matrix, asserting non-NaN output for at least one valid input domain point.

## Inverse Test IDs (Matrix Contract)

Canonical suite: `tests/operatorTestingMatrix.contract.test.ts` (`contracts/operator-testing-matrix`).

Invertible operator mappings:
- Plan resolvability coverage:
`INV-PLAN-OP-ADD-01`, `INV-PLAN-OP-SUB-01`, `INV-PLAN-OP-MUL-01`, `INV-PLAN-OP-DIV-01`, `INV-PLAN-OP-POW-01`, `INV-PLAN-OP-ROTATE15-01`, `INV-PLAN-OP-WHOLE-STEPS-01`, `INV-PLAN-OP-INTERVAL-01`, `INV-PLAN-UNARY-INC-01`, `INV-PLAN-UNARY-DEC-01`, `INV-PLAN-UNARY-NEG-01`, `INV-PLAN-UNARY-I-01`, `INV-PLAN-UNARY-ROTATE15-01`, `INV-PLAN-UNARY-RECIPROCAL-01`, `INV-PLAN-UNARY-PLUS-I-01`, `INV-PLAN-UNARY-MINUS-I-01`, `INV-PLAN-UNARY-CONJUGATE-01`, `INV-PLAN-UNARY-REAL-FLIP-01`.
- Runtime inverse execution (non-NaN) coverage:
`INV-EXEC-OP-WHOLE-STEPS-01`, `INV-EXEC-OP-INTERVAL-01`, `INV-EXEC-UNARY-RECIPROCAL-01`, `INV-EXEC-UNARY-PLUS-I-01`, `INV-EXEC-UNARY-CONJUGATE-01`, `INV-EXEC-UNARY-REAL-FLIP-01`.
- Canonical inverse root + ambiguity metadata coverage:
`INV-EXEC-OP-POW-PRINCIPAL-01`, `INV-EXEC-OP-POW-AMB-META-01`, `INV-EXEC-OP-POW-AMB-NEG-01`, `INV-EXEC-OP-POW-AMB-NEG-02`.
- Algebraic scaling + exact ordering coverage:
`ALG-OP-WHOLE-STEPS-01`, `ALG-OP-INTERVAL-01`, `ALG-UNARY-FLOOR-01`, `ALG-UNARY-CEIL-01`.
- Conditional guard coverage (`yes*`):
`INV-PLAN-OP-MUL-GUARD-01`, `INV-PLAN-OP-DIV-GUARD-01`, `INV-PLAN-OP-POW-GUARD-01`, `INV-PLAN-OP-INTERVAL-GUARD-01A`, `INV-PLAN-OP-INTERVAL-GUARD-01B`.

Inverse runtime-mode transfer coverage:
- `INV-MODE-01`, `INV-MODE-02`, `INV-MODE-03` (inverse mode + staged step behavior formerly in reducer parity suite)

## Outcome Legend

- `ok:<value>`: deterministic non-error result.
- `ok:complex`: deterministic complex non-NaN result (exact value asserted in tests).
- `ok:expr`: deterministic non-NaN symbolic/algebraic result.
- `reject:nan_input`: runtime rejects input kind.
- `reject:unsupported_symbolic`: runtime rejects symbolic/radical path.
- `reject:division_by_zero`: runtime rejects zero denominator/inverse.

## Binary Operator Matrix

| Operator | Commutative | Complex Accepted | Radical Accepted | NaN Seed Accepted | Invertible | `B-F / B-Z / B-O` expected | `B-S1` vs `B-S2` expected | Complex category expected | Radical category expected | NaN category expected |
|---|---|---|---|---|---|---|---|---|---|---|
| `op_add` | yes | yes | yes | no | yes | `ok:9/2 / 2 / 3` | equal (`5` vs `5`) | `ok:complex` (adds `b` to real part) | `ok:expr` (`sqrt(2)+2`, `1/sqrt(2)+2`) | `reject:nan_input` |
| `op_sub` | no | yes | yes | no | yes | `ok:1/2 / -2 / -1` | different (`-1` vs `1`) | `ok:complex` (subtracts `b` from real part) | `ok:expr` (`sqrt(2)-2`, `1/sqrt(2)-2`) | `reject:nan_input` |
| `op_mul` | yes | yes | yes | no | yes* | `ok:5 / 0 / 2` | equal (`6` vs `6`) | `ok:complex` (scales re/im by `b`) | `ok:expr` (`2*sqrt(2)`, `2/sqrt(2)`) | `reject:nan_input` |
| `op_div` | no | yes | yes | no | yes* | `ok:5/4 / 0 / 1/2` | different (`2/3` vs `3/2`) | `ok:complex` (divides re/im by `b`) | `ok:expr` (`sqrt(2)/2`, `1/(2sqrt(2))`) | `reject:nan_input` |
| `op_pow` | no | yes | yes | no | yes* | `ok:25/4 / 0 / 1` | different (`8` vs `9`) | `ok:complex` (`(a+bi)^b`, integer exponent) | `ok:expr_or_complex` (`(sqrt(2))^2`, `(1/sqrt(2))^2`) | `reject:nan_input` |
| `op_euclid_div` | no | yes (gaussian-int path) | no | no | no | `ok:1 / 0 / 0` | different (`0` vs `1`) | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_euclid_tuple` | no | yes (gaussian-int + pure-real) | no | no | no | `ok:(1 + i*1/2) / (0 + i*0) / (0 + i*1)` | different (`0 + i*2` vs `1 + i*1`) | `ok:complex` on `C-IM/C-Q1/C-NQ1`; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_eulog` | no | yes (complex-rational) | no | no | no | `ok:-1 / reject:nan_input / 0` | different (`0` vs `1`) | `ok:rational` on complex-rational inputs | `reject:nan_input` | `reject:nan_input` |
| `op_residual` | no | yes (complex-rational) | no | no | no | `ok:5 / reject:nan_input / 1` | different (`2` vs `3`) | `ok:complex_or_rational` on complex-rational inputs | `reject:nan_input` | `reject:nan_input` |
| `op_log_tuple` | no | yes (complex-rational) | no | no | no | `ok:(-1 + i*5) / reject:nan_input / (0 + i*1)` | different (`0 + i*2` vs `1 + i*3`) | `ok:complex` on complex-rational inputs | `reject:nan_input` | `reject:nan_input` |
| `op_whole_steps` | no | yes | no | no | yes | `ok:405/128 / 0 / 81/64` | different | `ok:complex` (multiplies by `(9/8)^b`) | `ok:complex` for algebraic-basis inputs (`A-SQRT2 -> (81/64)sqrt(2)`); expression-only radicals remain rejected | `reject:nan_input` |
| `op_interval` | no | yes | no | no | yes* | `ok:15/4 / 0 / 3/2` | different | `ok:complex` (multiplies by `(b+1)/b`) | `ok:complex` for algebraic-basis inputs (`A-SQRT3 -> (3/2)sqrt(3)`); expression-only radicals remain rejected | `reject:nan_input` |
| `op_mod` | no | yes (gaussian-int path) | no | no | no | `ok:1/2 / 0 / 1` | different (`2` vs `1`) | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_rotate_left` | no | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:0 / ok:1` | different (`23` vs `32`) | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_rotate_15` | no | yes | no | no | yes | `ok:complex / ok:0 / ok:complex` | different | `ok:complex` (rotates by `b * 15deg`) | `reject:unsupported_symbolic` | `reject:nan_input` |
| `op_gcd` | yes | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:2 / ok:1` | equal (`1` vs `1`) | `ok:rational` on Gaussian integer norm path; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_lcm` | yes | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:0 / ok:2` | equal (`6` vs `6`) | `ok:rational` on Gaussian integer norm path; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `op_max` | yes | yes | yes | no | no | `ok:5/2 / 2 / 2` | equal (`3` vs `3`) | `ok:complex_or_scalar` by magnitude comparison | `ok:expr_or_scalar` by exact/approx compare | `reject:nan_input` |
| `op_min` | yes | yes | yes | no | no | `ok:2 / 0 / 1` | equal (`2` vs `2`) | `ok:complex_or_scalar` by magnitude comparison | `ok:expr_or_scalar` by exact/approx compare | `reject:nan_input` |

## Unary Operator Matrix

| Operator | Complex Accepted | Radical Accepted | NaN Seed Accepted | Invertible | `B-F / B-Z / B-O` expected | Complex category expected | Radical category expected | NaN category expected |
|---|---|---|---|---|---|---|---|---|
| `unary_inc` | yes | yes | no | yes | `ok:7/2 / 1 / 2` | `ok:complex` (real part +1) | `ok:expr` | `reject:nan_input` |
| `unary_dec` | yes | yes | no | yes | `ok:3/2 / -1 / 0` | `ok:complex` (real part -1) | `ok:expr` | `reject:nan_input` |
| `unary_neg` | yes | yes | no | yes | `ok:-5/2 / 0 / -1` | `ok:complex` (negate re/im) | `ok:expr` | `reject:nan_input` |
| `unary_sigma` | yes (gaussian-int path) | no | no | no | `reject:nan_input / reject:nan_input / ok:1` | `ok:rational` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_phi` | yes (gaussian-int path) | no | no | no | `reject:nan_input / reject:nan_input / ok:1` | `ok:rational` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_omega` | yes (gaussian-int path) | no | no | no | `reject:nan_input / reject:nan_input / ok:0` | `ok:rational` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_not` | no (maps non-NaN to NaN) | no | yes | no | `ok:NaN / ok:NaN / ok:NaN` | `ok:NaN` | `ok:NaN` | `ok:1` |
| `unary_collatz` | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:0 / ok:4` | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_sort_asc` | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:0 / ok:1` | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_mirror_digits` | yes (gaussian-int path) | no | no | no | `reject:nan_input / ok:0 / ok:1` | `ok:complex` on Gaussian integer; `reject:nan_input` on `C-FR` | `reject:nan_input` | `reject:nan_input` |
| `unary_floor` | yes | no | no | no | `ok:2 / 0 / 1` | `ok:complex` (componentwise floor) on rational/algebraic components | `ok:rational` for algebraic-basis components (`A-MIX -> floor(-1/2 + sqrt(3)) = 1`) | `reject:nan_input` |
| `unary_ceil` | yes | no | no | no | `ok:3 / 0 / 1` | `ok:complex` (componentwise ceil) on rational/algebraic components | `ok:rational` for algebraic-basis components (`A-MIX -> ceil(-1/2 + sqrt(3)) = 2`) | `reject:nan_input` |
| `unary_i` | yes | yes | no | yes | `ok:(0 + i*5/2) / ok:0 / ok:i` | `ok:complex` (multiply by `i`) | `ok:complex_or_expr` | `reject:nan_input` |
| `unary_rotate_15` | yes | yes | no | yes | `ok:complex / ok:0 / ok:complex` | `ok:complex` (rotate +15deg) | `ok:complex_or_expr` | `reject:nan_input` |
| `unary_reciprocal` | yes | yes | no | yes* | `ok:2/5 / reject:division_by_zero / ok:1` | `ok:complex` (inverse) | `ok:expr_or_complex` | `reject:nan_input` |
| `unary_plus_i` | yes | yes | no | yes | `ok:(5/2 + i) / ok:i / ok:(1+i)` | `ok:complex` (`im + 1`) | `ok:complex_or_expr` | `reject:nan_input` |
| `unary_minus_i` | yes | yes | no | yes | `ok:(5/2 - i) / ok:-i / ok:(1-i)` | `ok:complex` (`im - 1`) | `ok:complex_or_expr` | `reject:nan_input` |
| `unary_conjugate` | yes | yes | no | yes | `ok:5/2 / 0 / 1` | `ok:complex` (flip imaginary sign) | `ok:expr_or_complex` | `reject:nan_input` |
| `unary_real_flip` | yes | yes | no | yes | `ok:-5/2 / 0 / -1` | `ok:complex` (flip real sign) | `ok:expr_or_complex` | `reject:nan_input` |
| `unary_imaginary_part` | yes | yes | no | no | `ok:0 / 0 / 0` (pure-real seeds) | `ok:complex` (`0 + i*im`) | `ok:complex_or_expr` | `reject:nan_input` |
| `unary_real_part` | yes | yes | no | no | `ok:5/2 / 0 / 1` | `ok:rational_or_expr` (returns real component) | `ok:rational_or_expr` | `reject:nan_input` |

## Matrix Maintenance Rules

1. Any operator behavior change requires updating this file in the same PR as tests.
2. New operator IDs must add:
- one row in the appropriate table,
- scenario expectations for all applicable categories,
- at least one matrix-linked test ID in the corresponding test entrypoint.
3. If an operator has a deferred policy status, expected outcome cells must explicitly mark current runtime behavior (`ok` or `reject:*`) rather than roadmap intent.
4. Every operator marked `Invertible = yes` or `yes*` must have at least one `I-01` test using `exec_roll_inverse` + `exec_step_through` that produces a non-NaN output on a valid input.
5. `yes*` means invertible only under stated guard conditions (for example non-zero operand, non-zero exponent, or non-ambiguous inverse root domain).
6. `op_pow` inverse root canonicalization uses principal branch output when representable in allowed basis; ambiguous/multi-branch semantics must still be asserted via inverse ambiguity metadata.
