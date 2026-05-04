# Unlock Planning Matrix

Purpose: planning matrix for unlock conditions that can be satisfied using only a key's immediate parents in the dependency map.

Status: draft. Rows are intentionally blank where no condition has been chosen yet.

Sequencing note: this pass uses `dependency_map_A.mmd` as the intended graph sequence. Sandbox-installed keys are the priority planning rows. When a graph parent is conceptual or not yet represented as a playable key, the row may name that parent and use conservative placeholder wording.

## Operator Keys

| Key | Label | Family | Immediate parent source | Immediate-parent-only unlock condition |
| --- | --- | --- | --- | --- |
| `unary_inc` | `++` | arithmetic | starter primitive | Starter key. |
| `unary_dec` | `--` | arithmetic | `unary_inc`, inverse execution | Use inverse execution on `++`, or produce a descending run that clearly behaves as repeated inverse increment. |
| `op_add` | `+` | arithmetic | `unary_inc` | Produce a roll tail with equal positive jumps greater than `1`, such as `2, 5, 8, 11, 14`, using repeated increment behavior. |
| `op_sub` | `-` | arithmetic | `unary_dec`, `op_add` | Produce a roll tail with equal negative jumps whose magnitude is greater than `1`, such as `10, 7, 4, 1, -2`. |
| `op_mul` | `x` | arithmetic | `op_add` | Produce repeated equal jumps where the jump equals a chosen seed or operand for several entries, such as `4, 8, 12, 16, 20`. |
| `op_pow` | `^` | arithmetic | `op_mul` | Produce constant-ratio growth for 5-7 roll entries, such as `2, 4, 8, 16, 32`. |
| `op_div` | `/` | ratios | `op_mul`, `op_sub` | Reverse a multiplication or reach a non-integer rational result using only multiplication/subtraction-derived behavior. |
| `op_euclid_div` | `euclid_div` | division | `op_euclid_tuple` | Extract or stabilize the quotient view from a quotient/remainder tuple, such as `7 / 3 -> 2`. |
| `op_mod` | `mod` | division | `op_euclid_tuple` | Extract or stabilize the remainder view from a quotient/remainder tuple, such as `7 mod 3 -> 1`. |
| `op_euclid_tuple` | `euclid_tuple` | division | `op_mul`, `op_sub` | Produce a division construction where quotient and remainder are both visible as one combined result. |
| `op_eulog` | `eulog` | logs | `op_log_tuple` | Extract the whole-exponent view from a power/log tuple, such as base `2` reaching `8` gives exponent `3`. |
| `op_residual` | `residual` | logs | `op_log_tuple` | Extract the residual view from a power/log tuple, such as `20` against base `3` giving residual `20/9`. |
| `op_log_tuple` | `log_tuple` | logs | `op_pow`, `op_euclid_tuple` | Produce a power/log construction where whole exponent and residual are both visible as one combined result. |
| `unary_reciprocal` | `1/n` | ratios | `op_euclid_div` or division path | Create `1/n` or use division where the numerator is `1`. |
| `op_whole_steps` | `whole_steps` | ratios/music | `op_div`, `unary_reciprocal`, `op_pow` | Produce a repeated multiplicative interval, such as powers of `9/8`. |
| `op_interval` | `interval` | ratios/music | `op_whole_steps` | Produce equal-denominator or equal-ratio interval behavior that shows multiplicative distance rather than additive distance. |
| `unary_i` | `x i` | complex | complex quarter-turn / division path | Produce a nonzero imaginary component from parent behavior. |
| `unary_plus_i` | `+ i` | complex | complex quarter-turn | Produce a nonzero imaginary component, then show unit positive movement on the imaginary axis. |
| `unary_minus_i` | `- i` | complex | complex quarter-turn | Produce a nonzero imaginary component, then show unit negative movement on the imaginary axis. |
| `unary_conjugate` | `conjugate` | complex | complex quarter-turn | Produce a pair with equal real part and opposite imaginary parts. |
| `unary_real_flip` | `real_flip` | complex | complex quarter-turn, multiplication | Produce a pair with equal imaginary part and opposite real parts. |
| `unary_imaginary_part` | `imaginary_part` | complex | `unary_real_flip` | Use axis reflection behavior to isolate the imaginary component. |
| `unary_real_part` | `real_part` | complex | `unary_conjugate` | Use conjugate behavior to isolate the real component. |
| `op_rotate_15` | `rotate_15` | rotation | `unary_rotate_15` or angle unit path | Produce a repeated 24th-turn path or quadrant-hop sequence. |
| `unary_rotate_15` | `rotate_15_unary` | rotation | rotation unit path | Produce a single 24th-turn movement from a real seed and make the circle/plane change visible. |
| `op_rotate_left` | `rotate_left` | rotation |  |  |
| `unary_neg` | `negate` | arithmetic/complex | `unary_dec`, `op_sub` | Produce an opposite pair around zero, then use the sign-flip abstraction. |
| `unary_floor` | `floor` | division/ratios | `op_euclid_tuple` or `op_mod` | Produce a non-integer rational and show the integer part is stable under quotient-style reasoning. |
| `unary_ceil` | `ceil` | division/ratios | `unary_floor`, `op_mod` | Produce a non-integer rational and show the next integer boundary via floor plus nonzero remainder. |
| `unary_not` | `not` | boolean | division by zero / bottom | Intentionally produce the first false/bottom state, then use negation to recover a truthy value. |
| `op_gcd` | `gcd` | number theory |  |  |
| `op_lcm` | `lcm` | number theory |  |  |
| `op_max` | `max` | comparison |  |  |
| `op_min` | `min` | comparison |  |  |
| `unary_sigma` | `sigma` | number theory |  |  |
| `unary_phi` | `phi` | number theory | `op_euclid_tuple` / future number-theory path | Tentative: produce repeated coprime/residue evidence for one integer, then unlock the count of coprime residues. |
| `unary_omega` | `omega` | number theory |  |  |
| `unary_collatz` | `collatz` | experimental | `unary_not`, divisibility/boolean path | Tentative experimental: produce even/odd branch behavior, then unlock the named branch transform. |
| `unary_sort_asc` | `sort_digits_asc` | digit manipulation |  |  |
| `unary_mirror_digits` | `mirror_digits` | digit manipulation |  |  |

## Non-Operator Keys

| Key | Label | Category | Immediate parent source | Immediate-parent-only unlock condition |
| --- | --- | --- | --- | --- |
| `digit_0` | `0` | digit | `unary_dec` / crossing zero | Reach exactly `0` from a positive state using decrement or subtraction behavior. |
| `digit_1` | `1` | digit | `unary_inc` | Reach total `1` using `++`. |
| `digit_2` | `2` | digit | `digit_1`, `unary_inc` | Reach total `2` by applying `++` from `1`. |
| `digit_3` | `3` | digit | `digit_2`, `unary_inc` | Reach total `3` by applying `++` from `2`. |
| `digit_4` | `4` | digit | `op_add` or linear-growth path | Produce a linear run that lands on `4`. |
| `digit_5` | `5` | digit | `digit_4`, `unary_inc` | Reach total `5` from `4`. |
| `digit_6` | `6` | digit | `digit_5`, `unary_inc` | Reach total `6` from `5`. |
| `digit_7` | `7` | digit | `digit_6`, `unary_inc` | Reach total `7` from `6`. |
| `digit_8` | `8` | digit | `op_mul` / powers-of-two path | Produce `1, 2, 4, 8` or another parent-only doubling path. |
| `digit_9` | `9` | digit | `op_pow` | Produce `3 ^ 2 = 9` or another parent-only square/power path. |
| `const_pi` | `pi` | constant |  |  |
| `const_e` | `e` | constant |  |  |
| `const_bottom` | `bottom` | constant | division by zero / boolean path | Intentionally produce the first false/bottom state. |
| `const_roll_number` | `roll_number` | constant |  |  |
| `util_clear_all` | `C` | utility | error/draft path | Create the first bad or undesired function or error state where clearing is visibly useful. |
| `util_backspace` | `backspace` | utility | `util_clear_all` | Create a multi-slot or drafted operand mistake where removing one input is better than clearing all. |
| `util_undo` | `undo` | utility |  |  |
| `system_save_quit_main_menu` | `save_quit_main_menu` | system | system/session baseline | Starter/system affordance, not earned progression. |
| `system_quit_game` | `quit_game` | system |  |  |
| `system_mode_game` | `continue_game` | system |  |  |
| `system_new_game` | `new_game` | system |  |  |
| `system_mode_sandbox` | `sandbox` | system |  |  |
| `toggle_delta_range_clamp` | `delta_range_clamp` | setting |  |  |
| `toggle_mod_zero_to_delta` | `mod_zero_to_delta` | setting | modulo/cycle path | Produce a roll cycle with period greater than `2`. |
| `toggle_binary_octave_cycle` | `binary_octave_cycle` | setting | modulo/cycle path | Produce binary overflow or a repeating octave-style cycle. |
| `toggle_step_expansion` | `step_expansion` | setting | `exec_step_through` | Use step execution on a multi-slot function where intermediate expansion becomes useful. |
| `toggle_binary_mode` | `binary_mode` | setting | boolean path |  |
| `toggle_history` | `history` | setting | roll length path | Produce enough committed rows that previous rows matter. |
| `toggle_forecast` | `forecast` | setting | `toggle_history`, `exec_step_through` | Build a repeatable function where previewing the next result would clarify intent. |
| `toggle_cycle` | `cycle` | setting | modulo/cycle path | Produce a roll cycle with period greater than `2`. |
| `viz_graph` | `GRAPH` | visualizer | arithmetic/growth path | Produce a roll with enough changing totals that plotted shape or trend is useful. |
| `viz_feed` | `FEED` | visualizer | roll length path | Produce a long enough roll that history/feed becomes materially useful. |
| `viz_title` | `TITLE` | visualizer |  |  |
| `viz_release_notes` | `NOTES` | visualizer |  |  |
| `viz_help` | `HELP` | visualizer |  |  |
| `viz_factorization` | `factorization` | visualizer | number theory path |  |
| `viz_state` | `STATE` | visualizer |  |  |
| `viz_number_line` | `number_line` | visualizer | arithmetic path | Produce positive and negative movement where spatial position clarifies total changes. |
| `viz_circle` | `circle` | visualizer | rotation/complex path | Produce a repeated 24th-turn path or quadrant-hop sequence. |
| `viz_ratios` | `RATIO` | visualizer | ratio path | Produce repeated multiplicative interval behavior. |
| `viz_algebraic` | `ALG` | visualizer |  |  |
| `exec_equals` | `=` | execution | starter primitive | Starter execution key. |
| `exec_play_pause` | `play_pause` | execution | roll length path | Produce a long roll where repeated `=` stepping is clearly tedious. |
| `exec_step_through` | `step_through` | execution | `exec_equals` | Build a multi-step function where single-step execution is visibly more readable than immediate completion. |
| `exec_roll_inverse` | `roll_inverse` | execution | inverse path | Reverse a completed roll step, making inverse execution legible. |
