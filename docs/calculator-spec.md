Truth 1: Game Tuning

α - keypad width
β - keypad height
γ - operation slots
δ - range (max digits)
ϵ - speed (steps/second)
λ - unspent points

This document describes the relationships between control values, not how the individual values are used/implemented elsewhere in the calculator.

global rules:
- some values are derived only, and cannot be set or selected by the player
- lambda values can be spent and refunded between any non-derived values - integer increments only
- each player-settable values have a min..max limit, and this differs between calculators
- derived values should implicitly never go outside the (min)..(max) ranges based on user-controlled limits, but don't need to be explicitly prevented.
- resulting ' values are integer-only, rounded down

debug behavior:
- the values in the 5x5 matrices should be adjustable
- the input values/settable values should not have a debug override
- there should be a debug command to increase lambda by 1 point

==========
MENU CALCULATORS
==========
----------
Menu
----------
matrix:
 | 1    0    0    0    0 |   |1|   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   |6|   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × |0| = | [_ _] |
 | 0    0    0    1    0 |   |0|   | dig++ |
 | 0    0    0    0    1 |   |0|   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
 α     | ('1)            | ('1)            | no
 β     | ('6)            | ('6)            | no
 γ     | ('0)            | ('0)            | no
 δ     | ('0)            | ('0)            | no
 ϵ     | ('0)            | ('0)            | no

    | C1:               |
    |-------------------|
R6: | viz_title         |
R5: | viz_release_notes |
R4: | system_mode_game  |
R3: | system_new_game   |
R2: | system_mode_sandbox|
R1: | system_quit_game  |

in words:
the Menu calculator always has 1 column, 6 rows, and nothing for the other values.

its loadout contains game control keys (all locked with no unlock conditions)

----------
Settings
----------
Settings matrix:
 | 1    0    0    0    0 |   |2|   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   |3|   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × |0| = | [_ _] |
 | 0    0    0    1    0 |   |0|   | dig++ |
 | 0    0    0    0    1 |   |0|   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | ('2)            | ('2)            | no
β      | ('3)            | ('3)            | no
γ      | ('0)            | ('0)            | no
δ      | ('0)            | ('0)            | no
ϵ      | ('0)            | ('0)            | no

    | C2:               | C1:               |
    |-------------------|-------------------|
R4: | setting_1         | setting_2         |
R3: | Volume_dn         | Volume_up         |
R2: | viz_notes         | setting_4         |
R1: | viz_settn         | Hide Menu         |

in words:
the Settings Menu calculator has in-game controls, and can be shown/hidden by locking and unlocking the calculator

==========
GAMEPLAY CALCULATORS
==========
----------
f
----------
matrix:
 | 1    0    0    0    0 |   |α-2|   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   |β-2|   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × |γ-1| = | [_ _] |
 | 0.5  0.5  1    0    0 |   | 1 |   | dig++ |
 | 0.1  0.1  0.1  0.1  0 |   | 1 |   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | 2               | 2..8            | yes
β      | 3               | 2..8            | yes
γ      | 1               | 1..8            | yes
δ      | ('1)            | ('1)..('13)     | no
ϵ      | ('0)            | ('0)..('none)   | no

initial keypad layout:

    | C2:               | C1:               |
    |-------------------|-------------------|
R3: | system_save_quit_main_menu | [ ??? ]  |
R2: | (blank)           | (blank)           |
R1: | unary_inc         | exec_equals       |

in words:
delta increases proportionally to alpha and beta and gamma, with the effect of alpha and beta being half that of delta. intent: the range of numbers the player can calculate should expand as the complexity of the equation increases

epsilon increases slightly, proportionally to all the other values in equal measure. intent: the step speed should go up as complexity rises and the possible length of roll gets longer

calculator f begins with the increment operator, = key, and the save&quit key

----------
g
----------
matrix:
 | 1    0   -0.25 0    0 |   |5|   |α' -> ↔↔↔    |
 | 0    1    0    0    0 |   |2|   |β' -> ↕↕↕    |
 | 0    0    1    0    0 | × |γ| = |γ' -> [_ _]  |
 | 0    0    0    1    0 |   |8|   |δ' -> dig++  |
 | 0    0    0.5  0    0 |   |1|   |ϵ' -> tick++ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
 α     | ('4)            | ('1)..('4)      | no
 β     | ('2)            | ('2)..('2)      | no
 γ     | 3               | 0..11           | yes
 δ     | ('8)            | ('8)..('8)      | no
 ϵ     | ('0)            | ('0)..('none)   | no

initial keypad layout:

    | C4:               | C3:               | C2:               | C1:               |
    |-------------------|-------------------|-------------------|-------------------|
R2: | digit_1           | op_add            | wrap_0            | base-2            |
R1: | digit_0           | op_mul            | unary_not         | step              |


in words:
beta is fixed at 2, and alpha starts at 4, but decreases proportionally to gamma intent: player must choose between large keypad or long function chain

delta should resolve to 8, and cannot be changed by the player. intent: fix digits on calculator g to 8 

epsilon increases proportionally with gamma. intent: speed should rise sharply as complexity of steps increases

calculator g begins with a loadout conducive to binary/logic operations

==========
SANDBOX CALCULATORS
==========
----------
f'
----------
matrix:
 | 1    0    0    0    0 |   | 6 |   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   | 5 |   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × | 4 | = | [_ _] |
 | 0    0    0    1    0 |   |12 |   | dig++ |
 | 0    0    0    0    1 |   | 1 |   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | 6               | 6..6            | no
β      | 5               | 5..5            | no
γ      | 4               | 4..4            | no
δ      | 12              | 12..12          | no
ϵ      | 1               | 1..1            | no

initial keypad layout:

    | C6:               | C5:               | C4:               | C3:               | C2:               | C1:               |
    |-------------------|-------------------|-------------------|-------------------|-------------------|-------------------|
R5: | system_save_quit_main_menu | viz_number_line | (blank) | toggle_step_expansion| util_backspace    | util_clear_all    |
R4: | digit_7           | digit_8           | digit_9           | unary_floor       | unary_ceil        | exec_roll_inverse |
R3: | digit_4           | digit_5           | digit_6           | op_pow            | (blank)           | (blank)           |
R2: | digit_1           | digit_2           | digit_3           | op_mul            | op_euclid_div     | op_mod            |
R1: | digit_0           | (blank)           | unary_neg         | op_add            | op_sub            | exec_equals       |

in words:
f' is the "canonical" version of a fully-unlocked f calculator, so to speak.

f' is equipped with purely-arithmetic operators that (usually) produce integers.

alpha-epsilon all have fixed values that cannot change. 6-column/5-row keypad, 4 operator slots, 12 digits, 1 epsilon. Intent: in sandbox mode, the allocator elements are fixed.

==========
----------
g'
----------
matrix:
 | 1    0    0    0    0 |   | 7 |   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   | 2 |   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × |12 | = | [_ _] |
 | 0    0    0    1    0 |   | 8 |   | dig++ |
 | 0    0    0    0    1 |   | 4 |   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | 7               | 7..7            | no
β      | 2               | 2..2            | no
γ      | 12              | 12..12          | no
δ      | 8               | 8..8            | no
ϵ      | 4               | 4..4            | no

initial keypad layout:

    | C7:               | C6:               | C5:               | C4:               | C3:               | C2:               | C1:               |
    |-------------------|-------------------|-------------------|-------------------|-------------------|-------------------|-------------------|
R2: | digit_1           | unary_not         | (blank)           | (blank)           | op_mul            | toggle_binary_mode| (blank)           |
R1: | digit_0           | (blank)           | (blank)           | (blank)           | op_add            | toggle_mod_zero_to_delta | exec_equals|

in words:
g' is the "canonical" version of a fully-unlocked g calculator, so to speak.

g' is equipped with with logic-related operators.

alpha-epsilon all have fixed values that cannot change. 7-column/2-row keypad, 12 operator slots, 8 digits, 4 epsilon. Intent: in sandbox mode, the allocator elements are fixed.