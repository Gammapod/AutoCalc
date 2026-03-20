# Unary and binary operator audit (user-interactable operator keys only).
Date: 03/19/2026
Scope used: all KEY_ID.### op_* and KEY_ID.unary_* keys.
Unlock source: current unlockCatalog; if no entry exists, marked as no catalog unlock path.

## Unary Operators

### unary_inc
Keyface appearance: + +
Operator slot appearance: [ ++ ]
Usage examples:
5 [ ++ ] = 6
-2 [ ++ ] = -1
Expanded form examples:
5 [ + 1 ] = 6
-2 [ + 1 ] = -1
Unlock condition: total at least 10
Description: increments integer total by 1.

Verdict: good as-is

### unary_dec
Keyface appearance: − −
Operator slot appearance: [ −− ] (slot renderer visually spaces as [ – – ])
Usage examples:
5 [ −− ] = 4
0 [ −− ] = -1
Expanded form examples:
5 [ + -1 ] = 4
0 [ + -1 ] = -1
Unlock condition: total at least 10
Description: decrements integer total by 1.

Verdict: good as-is


### unary_neg
Keyface appearance: ±
Operator slot appearance: [ ± ]
Usage examples:
7 [ ± ] = -7
-3 [ ± ] = 3
Expanded form examples:
7 [ × -1 ] = -7
-3 [ × -1 ] = 3
Unlock condition: detect opposite-value 2-cycle in roll
Description: multiplies integer total by -1.

Verdict: good as-is

### unary_sigma
Keyface appearance: σ
Operator slot appearance: [ σ ]
Usage examples:
6 [ σ ] = 12
8 [ σ ] = 15
Expanded form examples:
6 [ Σ( [d|n] × d) ] = 12
8 [ Σ( [d|n] × d) ] = 15
Unlock condition: no catalog unlock path
Description: sum of positive divisors of |n| (integer-only, 0 invalid).

Verdict: change expanded form.
Corrected examples:
6 [ Σ_d( [d|n] × d) ] = 12
8 [ Σ_d( [d|n] × d) ] = 15
(_d should be subscript "d", if possible)

### unary_phi
Keyface appearance: φ
Operator slot appearance: [ φ ]
Usage examples:
9 [ φ ] = 6
1 [ φ ] = 1
Expanded form examples:
9 [ n × ∏(1-p^-1) ] = 6
1 [ n × ∏(1-p^-1) ] = 1
Unlock condition: no catalog unlock path
Description: Euler totient on |n| (integer-only, 0 invalid).

Verdict: good as-is

### unary_omega
Keyface appearance: Ω
Operator slot appearance: [ Ω ]
Usage examples:
12 [ Ω ] = 3
13 [ Ω ] = 1
Expanded form examples:
12 [ Σe_p ] = 3
13 [ Σe_p ] = 1
Unlock condition: no catalog unlock path
Description: total prime-factor multiplicity Ω(|n|) (integer-only, 0 invalid).

Verdict: change expanded form.
Corrected examples:
12 [ Σₚ(eₚ) ] = 3
13 [ Σₚ(eₚ) ] = 1

### unary_not
Keyface appearance: ¬
Operator slot appearance: [ ¬ ]
Usage examples:
0 [ ¬ ] = 1
5 [ ¬ ] = 0
Expanded form examples:
0 [ ¬(0) ] = 1
5 [ ¬(5) ] = 0
Unlock condition: no catalog unlock path
Description: logical-not style integer map (0→1, nonzero→0).

Verdict: Change functionality and expanded form.
Corrected examples:
0 [ ≤ 0 ] = 1
5 [ ≤ 0 ] = 0
Additional example:
-5 [ ¬ ] = 1
-5 [ ≤ 0 ] = 1
Corrected Description: non-negative check (0→1, negative→1, positive→0).

### unary_collatz
Keyface appearance: Ctz
Operator slot appearance: [ Ctz ]
Usage examples:
6 [ Ctz ] = 3
7 [ Ctz ] = 22
Expanded form examples:
6 [ Ctz(6) ] = 3
7 [ Ctz(7) ] = 22
Unlock condition: no catalog unlock path
Description: one Collatz step (even: n/2, odd: 3n+1) on integers.

Verdict: change expanded form.
Corrected examples:
6 [ ¬(6◇2)×(6÷2) + (6◇2)×(6×3+1) ] = 3
7 [ ¬(7◇2)×(7÷2) + (7◇2)×(7×3+1) ] = 22

### unary_sort_asc
Keyface appearance: ⇡d
Operator slot appearance: [ ⇡ ]
Usage examples:
3102 [ ⇡ ] = 123
-421 [ ⇡ ] = -124
Expanded form examples:
3102 [ ⇡(3102) ] = 123
-421 [ ⇡(-421) ] = -124
Unlock condition: no catalog unlock path
Description: sort digits ascending (sign preserved), integer-only.

Verdict: change expanded form.
Corrected examples:
3102 [ sort ] = 123
-421 [ sort ] = -124

### unary_floor
Keyface appearance: ⌊n⌋
Operator slot appearance: [ ⌊n⌋ ]
Usage examples:
7/2 [ ⌊n⌋ ] = 3
-7/2 [ ⌊n⌋ ] = -4
Expanded form examples:
7/2 [ ⌊n⌋(7/2) ] = 3
-7/2 [ ⌊n⌋(-7/2) ] = -4
Unlock condition: first rational non-integer result appears in roll
Description: floor of rational total.

Verdict: change expanded form, remove unlock condition.
Corrected examples:
7/2 [ 7⫽2 ] = 3
-7/2 [ -7⫽2 ] = -4
Corrected Unlock condition: no catalog unlock path

### unary_ceil
Keyface appearance: ⌈n⌉
Operator slot appearance: [ ⌈n⌉ ]
Usage examples:
7/2 [ ⌈n⌉ ] = 4
-7/2 [ ⌈n⌉ ] = -3
Expanded form examples:
7/2 [ ⌈n⌉(7/2) ] = 4
-7/2 [ ⌈n⌉(-7/2) ] = -3
Unlock condition: no catalog unlock path
Description: ceiling of rational total.

verdict: change expanded form
Corrected examples:
7/2 [ ⌊7/2⌋++ ] = 4
-7/2 [ ⌊-7/2⌋++ ] = -3

### unary_mirror_digits
Keyface appearance: ⇋d
Operator slot appearance: [ ⇋ ]
Usage examples:
1203 [ ⇋ ] = 3021
-450 [ ⇋ ] = -54
Expanded form examples:
1203 [ ⇋(1203) ] = 3021
-450 [ ⇋(-450) ] = -54
Unlock condition: no catalog unlock path
Description: reverse digits (sign preserved), integer-only.

verdict: change expanded form
Corrected examples:
1203 [ mirror ] = 3021
-450 [ mirror ] = -54

## Binary Operators

### op_add
Keyface appearance: +
Operator slot appearance: [ + _ ]
Usage examples:
5 [ + 3 ] = 8
-2 [ + 7 ] = 5
Expanded form examples:
5 [ +1 +1 +1 ] = 8
-2 [ +1 +1 +1 +1 +1 +1 +1 ] = 5
Unlock condition: linear growth-order run length 7
Description: add integer operand.

verdict: change expanded form
Corrected examples:
5 [ ++ ++ ++ ] = 8
-2 [ ++ ++ ++ ++ ++ ++ ++ ] = 5

### op_sub
Keyface appearance: -
Operator slot appearance: [ - _ ]
Usage examples:
9 [ - 4 ] = 5
3 [ - 8 ] = -5
Expanded form examples:
9 [ –1 –1 –1 –1 ] = 5
3 [ –1 –1 –1 –1 –1 –1 –1 –1 ] = -5
Unlock condition: total at most -1
Description: subtract integer operand.

verdict: change expanded form
Corrected examples:
9 [ -- -- -- -- ] = 5
3 [ -- -- -- -- -- -- -- -- ] = -5

### op_mul
Keyface appearance: ×
Operator slot appearance: [ × _ ]
Usage examples:
6 [ × 4 ] = 24
-3 [ × 5 ] = -15
Expanded form examples:
6 [ +n +n +n ] = 24
-3 [ +n +n +n +n ] = -15
Unlock condition: positive constant-step run (|step|>1), length 7
Description: multiply by integer operand.

verdict: change expanded form
Corrected examples:
6 [ + 6 + 6 + 6 ] = 24
-3 [ + -3 + -3 + -3 + -3 ] = -15

### op_pow
Keyface appearance: ^
Operator slot appearance: [ ^ _ ]
Usage examples:
2 [ ^ 5 ] = 32
9 [ ^ -1 ] = 1/9
Expanded form examples:
2 [ 2 ^ 5 ] = 32
9 [ 9 ^ -1 ] = 1/9
Unlock condition: exponential growth-order run length 7
Description: exponentiation by integer exponent.

verdict: change expanded form - this will require different expansions depending on operand type
Extra usage examples:
9 [ ^ 3/2 ] = 27
0 [ ^ 40 ] = 0
Corrected expansion of examples:
2 [ × 2 × 2 × 2 × 2 ] = 32 (5 total 2s, for when operand is positive integer)
9 [ ÷ 9 ÷ 9 ] = 1/9 (1+2 total 9s, for when operand is negative integer or 0)
9 [ ÷ 9 × (²√9) × (²√9) × (²√9) ] = 27 (3 total 2-3roots, for when operand )
0 [ × 0 ] (always returns 1 when first operand is 0)
^ Check my work on these to make sure they are mathematically valid or at least plausible as an abstraction

### op_div
Keyface appearance: ÷
Operator slot appearance: [ ÷ _ ]
Usage examples:
9 [ ÷ 4 ] = 9/4
-8 [ ÷ 2 ] = -4
Expanded form examples:
9 [ ×(1/4) ] = 9/4
-8 [ ×(1/2) ] = -4
Unlock condition: negative constant-step run (|step|>1) ending at 0, length 7
Description: divide by integer operand (0 causes division error).

Verdict: good as-is

### op_euclid_div
Keyface appearance: #/⟡
Operator slot appearance: [ # _ ]
Usage examples:
17 [ # 5 ] = 3
-17 [ # 5 ] = -4
Expanded form examples:
17 [ (⌊n ÷ 5⌋, n – q) ] = 3
-17 [ (⌊n ÷ 5⌋, n – q) ] = -4
Unlock condition: first rational non-integer result appears in roll
Description: Euclidean quotient by operand (tracks remainder separately).

Verdict: Change Keyface, operator slot, and expansion.
Corrected entry:
Keyface appearance: ⫽
Operator slot appearance: [ ⫽ _ ]
Usage examples:
17 [ ⫽ 5 ] = 3
-17 [ ⫽ 5 ] = -4
Expanded form examples:
17 [ q=⌊n ÷ 5⌋ ];r=n–q = 3
-17 [ q=⌊n ÷ 5⌋ ];r=n–q = -4

### op_mod
Keyface appearance: ⟡
Operator slot appearance: [ ♢ _ ]
Usage examples:
17 [ ♢ 5 ] = 2
-17 [ ♢ 5 ] = 3
Expanded form examples:
17 [ n – (m × ⌊n ÷ m⌋) ] = 2
-17 [ n – (m × ⌊n ÷ m⌋) ] = 3
Unlock condition: no catalog unlock path
Description: Euclidean remainder (non-negative for positive divisor).

Verdict: change operator slot appearance and expanded form
Corrected Operator slot appearance: [ ◇ _ ]
Corrected expansions:
17 [ ÷ 5 – (17⫽5) ] = 2
-17 [ ÷ 5 – (-17⫽5) ] = 3

### op_rotate_left
Keyface appearance: ↺
Operator slot appearance: [ ↺ _ ]
Usage examples:
12345 [ ↺ 2 ] = 34512
-907 [ ↺ 1 ] = -79
Expanded form examples:
12345 [ n << ] = 34512
-907 [ n < ] = -79
Unlock condition: no catalog unlock path
Description: rotate decimal digits left by operand count (sign preserved).
Verdict: change expanded form
Corrected Expanded form:
12345 [ 12 ⇄ 345 ] = 34512
-907 [ -(9 ⇄ 07) ] = -79

### op_gcd
Keyface appearance: ⋀
Operator slot appearance: [ ⋀ _ ]
Usage examples:
48 [ ⋀ 18 ] = 6
-21 [ ⋀ 14 ] = 7
Expanded form examples:
48 [ ∏p^(e_a ╧ e_b) ] = 6
-21 [ ∏p^(e_a ╧ e_b) ] = 7
Unlock condition: no catalog unlock path
Description: greatest common divisor on integer totals/operand.

Verdict: fine as-is

### op_lcm
Keyface appearance: ⋁
Operator slot appearance: [ ⋁ _ ]
Usage examples:
12 [ ⋁ 18 ] = 36
-6 [ ⋁ 8 ] = 24
Expanded form examples:
12 [ ∏p^(e_a ╤ e_b) ] = 36
-6 [ ∏p^(e_a ╤ e_b) ] = 24
Unlock condition: no catalog unlock path
Description: least common multiple on integer totals/operand.

Verdict: fine as-is

### op_max
Keyface appearance: ╧
Operator slot appearance: [ ╧ _ ]
Usage examples:
7 [ ╧ 3 ] = 7
-2 [ ╧ 5 ] = 5
Expanded form examples:
7 [ 7 ╧ 3 ] = 7
-2 [ -2 ╧ 5 ] = 5
Unlock condition: no catalog unlock path
Description: max(total, operand), numeric compare.

Verdict: change expanded form
Expanded form examples:
7 [ < 3 × 3 + ¬(7 ≤ 3 × 7) ] = 7
-2 [ < 5 × 5 + ¬(-2 ≤ 5 × -2) ] = 5

### op_min
Keyface appearance: ╤
Operator slot appearance: [ ╤ _ ]
Usage examples:
7 [ ╤ 3 ] = 3
-2 [ ╤ 5 ] = -2
Expanded form examples:
7 [ 7 ╤ 3 ] = 3
-2 [ -2 ╤ 5 ] = -2
Unlock condition: no catalog unlock path
Description: min(total, operand), numeric compare.

Verdict: change expanded form
Expanded form examples:
7 [ < 3 × 7 + ¬(7 ≤ 3 × 3) ] = 7
-2 [ < 5 × -2 + ¬(-2 ≤ 5 × 5) ] = 5

### op_greater
Keyface appearance: >
Operator slot appearance: [ > _ ]
Usage examples:
7 [ > 3 ] = 1
2 [ > 9 ] = 0
Expanded form examples:
7 [ 7 > 3 ] = 1
2 [ 2 > 9 ] = 0
Unlock condition: no catalog unlock path
Description: comparison predicate, returns 1 if a>b, else 0.

Verdict: remove > key