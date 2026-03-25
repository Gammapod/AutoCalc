Truth 1: Game Tuning

Last Edited: 3/22/2026

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

CHANGES TO F MATRIX
PLANNED: 3/22/2026
IMPLEMENTED: [date when finished]

<---CHANGE START (clear when finished)

f matrix:
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

    | C2:       | C1:       |
    |-----------|-----------|
R3: | Save&Quit |           |
R2: |           |           |
R1: | ++        | =         |

in words:
delta increases proportionally to alpha and beta and gamma, with the effect of alpha and beta being half that of delta. intent: the range of numbers the player can calculate should expand as the complexity of the equation increases

epsilon increases slightly, proportionally to all the other values in equal measure. intent: the step speed should go up as complexity rises and the possible length of roll gets longer

calculator f begins with the increment operator, = key, and the save&quit key

CHANGE END--->  (clear when finished)

g matrix:
 | 1    0   -0.25 0    0 |   |5|   |α' -> ↔↔↔    |
 | 0    1    0    0    0 |   |2|   |β' -> ↕↕↕    |
 | 0    0    1    0    0 | × |γ| = |γ' -> [_ _]  |
 | 0    0    0    1    0 |   |8|   |δ' -> dig++  |
 | 0    0    0.5  0    0 |   |1|   |ϵ' -> tick++ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | ('4)            | ('1)..('4)      | no
β      | ('2)            | ('2)..('2)      | no
γ      | 3               | 0..11           | yes
δ      | ('8)            | ('8)..('8)      | no
ϵ      | ('0)            | ('0)..('none)   | no

initial keypad layout:

    | C4:       | C3:       | C2:       | C1:       |
    |-----------|-----------|-----------|-----------|
R2: | digit_1   | +         | wrap_0    | base-2    |
R1: | digit_0   | ×         | ¬         | step      |


in words:
beta is fixed at 2, and alpha starts at 4, but decreases proportionally to gamma intent: player must choose between large keypad or long function chain

delta should resolve to 8, and cannot be changed by the player. intent: fix digits on calculator g to 8 

epsilon increases proportionally with gamma. intent: speed should rise sharply as complexity of steps increases

calculator g begins with a loadout conducive to binary/logic operations

NEW MATRIX
PLANNED: 3/22/2026
IMPLEMENTED: [date when finished]

<---CHANGE START (clear when finished)

Menu matrix:
 | 1    0    0    0    0 |   |1|   | ↔↔↔↔↔ |
 | 0    1    0    0    0 |   |6|   | ↕↕↕↕↕ |
 | 0    0    1    0    0 | × |0| = | [_ _] |
 | 0    0    0    1    0 |   |0|   | dig++ |
 | 0    0    0    0    1 |   |0|   | tick+ |

Symbol | Starting values | min..max Values | Settable?
-------|-----------------|-----------------|-----------
α      | ('1)            | ('1)            | no
β      | ('6)            | ('6)            | no
γ      | ('0)            | ('0)            | no
δ      | ('0)            | ('0)            | no
ϵ      | ('0)            | ('0)            | no

    | C1:       |
    |-----------|
R6: | viz_title |
R5: | viz_notes |
R4: | Continue  |
R3: | New Game  |
R2: | Settings  |
R1: | Quit Game |

in words:
the Menu calculator always has 1 column, 6 rows, and nothing for the other values.

its loadout contains game control keys

CHANGE END--->  (clear when finished)


NEW MATRIX
PLANNED: [planning not complete, DO NOT IMPLEMENT]
IMPLEMENTED: [date when finished]

<---CHANGE START (clear when finished)

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

    | C2:       | C1:       |
    |-----------|-----------|
R4: | setting_1 | setting_2 |
R3: | Volume_dn | Volume_up |
R2: | viz_notes | setting_4 |
R1: | viz_settn | Hide Menu |

in words:
the Settings Menu calculator has in-game controls, and can be shown/hidden by locking and unlocking the calculator

CHANGE END--->  (clear when finished)