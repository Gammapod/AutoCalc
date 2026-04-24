Truth 1: Game Tuning

==========
MENU CALCULATORS
==========
----------
Menu
----------

{
  "schema": "debug_calculator_snapshot_v3",
  "capturedAt": "2026-04-18T19:13:20.334Z",
  "calculatorId": "menu",
  "lambdaControl": {
    "alpha": 7,
    "beta": 7,
    "gamma": 4,
    "delta": 12,
    "delta_q": 12,
    "epsilon": 0
  },
  "keypad": {
    "columns": 1,
    "rows": 6,
    "keyLayoutDebug": [
      {
        "index": 0,
        "rowColId": "R6C1",
        "row": 6,
        "col": 1,
        "kind": "key",
        "key": "viz_title",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 1,
        "rowColId": "R5C1",
        "row": 5,
        "col": 1,
        "kind": "key",
        "key": "viz_release_notes",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 2,
        "rowColId": "R4C1",
        "row": 4,
        "col": 1,
        "kind": "key",
        "key": "system_mode_game",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 3,
        "rowColId": "R3C1",
        "row": 3,
        "col": 1,
        "kind": "key",
        "key": "system_new_game",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 4,
        "rowColId": "R2C1",
        "row": 2,
        "col": 1,
        "kind": "key",
        "key": "system_mode_sandbox",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 5,
        "rowColId": "R1C1",
        "row": 1,
        "col": 1,
        "kind": "key",
        "key": "system_quit_game",
        "status": "unlock",
        "capability": "portable"
      }
    ]
  }
}

<!-- ----------
Settings
----------

    | C2:               | C1:               |
    |-------------------|-------------------|
R4: | setting_1         | setting_2         |
R3: | Volume_dn         | Volume_up         |
R2: | viz_notes         | setting_4         |
R1: | viz_settn         | Hide Menu         |

in words:
the Settings Menu calculator has in-game controls, and can be shown/hidden by locking and unlocking the calculator -->

==========
GAMEPLAY CALCULATORS
==========
----------
f
----------

initial keypad layout:

    | C2:               | C1:               |
    |-------------------|-------------------|
R3: | system_save_quit_main_menu | [ ??? ]  |
R2: | (blank)           | (blank)           |
R1: | unary_inc         | exec_equals       |

in words:

calculator f begins with the increment operator, = key, and the save&quit key

----------
g
----------

initial keypad layout:

    | C4:               | C3:               | C2:               | C1:               |
    |-------------------|-------------------|-------------------|-------------------|
R2: | digit_1           | op_add            | wrap_0            | base-2            |
R1: | digit_0           | op_mul            | unary_not         | step              |


in words:

calculator g begins with a loadout conducive to binary/logic operations

==========
SANDBOX CALCULATORS
==========
----------
f'
----------

{
  "schema": "debug_calculator_snapshot_v3",
  "capturedAt": "2026-04-24T18:33:18.909Z",
  "calculatorId": "f",
  "lambdaControl": {
    "alpha": 6,
    "beta": 5,
    "gamma": 4,
    "delta": 12,
    "delta_q": 12,
    "epsilon": 1
  },
  "keypad": {
    "columns": 6,
    "rows": 5,
    "keyLayoutDebug": [
      {
        "index": 0,
        "rowColId": "R5C6",
        "row": 5,
        "col": 6,
        "kind": "key",
        "key": "system_save_quit_main_menu",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 1,
        "rowColId": "R5C5",
        "row": 5,
        "col": 5,
        "kind": "key",
        "key": "viz_number_line",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 2,
        "rowColId": "R5C4",
        "row": 5,
        "col": 4,
        "kind": "placeholder",
        "area": "empty"
      },
      {
        "index": 3,
        "rowColId": "R5C3",
        "row": 5,
        "col": 3,
        "kind": "key",
        "key": "toggle_step_expansion",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 4,
        "rowColId": "R5C2",
        "row": 5,
        "col": 2,
        "kind": "key",
        "key": "util_backspace",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 5,
        "rowColId": "R5C1",
        "row": 5,
        "col": 1,
        "kind": "key",
        "key": "util_clear_all",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 6,
        "rowColId": "R4C6",
        "row": 4,
        "col": 6,
        "kind": "key",
        "key": "digit_7",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 7,
        "rowColId": "R4C5",
        "row": 4,
        "col": 5,
        "kind": "key",
        "key": "digit_8",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 8,
        "rowColId": "R4C4",
        "row": 4,
        "col": 4,
        "kind": "key",
        "key": "digit_9",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 9,
        "rowColId": "R4C3",
        "row": 4,
        "col": 3,
        "kind": "key",
        "key": "unary_floor",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 10,
        "rowColId": "R4C2",
        "row": 4,
        "col": 2,
        "kind": "key",
        "key": "unary_ceil",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 11,
        "rowColId": "R4C1",
        "row": 4,
        "col": 1,
        "kind": "key",
        "key": "exec_roll_inverse",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 12,
        "rowColId": "R3C6",
        "row": 3,
        "col": 6,
        "kind": "key",
        "key": "digit_4",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 13,
        "rowColId": "R3C5",
        "row": 3,
        "col": 5,
        "kind": "key",
        "key": "digit_5",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 14,
        "rowColId": "R3C4",
        "row": 3,
        "col": 4,
        "kind": "key",
        "key": "digit_6",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 15,
        "rowColId": "R3C3",
        "row": 3,
        "col": 3,
        "kind": "key",
        "key": "op_pow",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 16,
        "rowColId": "R3C2",
        "row": 3,
        "col": 2,
        "kind": "placeholder",
        "area": "empty"
      },
      {
        "index": 17,
        "rowColId": "R3C1",
        "row": 3,
        "col": 1,
        "kind": "placeholder",
        "area": "empty"
      },
      {
        "index": 18,
        "rowColId": "R2C6",
        "row": 2,
        "col": 6,
        "kind": "key",
        "key": "digit_1",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 19,
        "rowColId": "R2C5",
        "row": 2,
        "col": 5,
        "kind": "key",
        "key": "digit_2",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 20,
        "rowColId": "R2C4",
        "row": 2,
        "col": 4,
        "kind": "key",
        "key": "digit_3",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 21,
        "rowColId": "R2C3",
        "row": 2,
        "col": 3,
        "kind": "key",
        "key": "op_mul",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 22,
        "rowColId": "R2C2",
        "row": 2,
        "col": 2,
        "kind": "key",
        "key": "op_euclid_div",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 23,
        "rowColId": "R2C1",
        "row": 2,
        "col": 1,
        "kind": "key",
        "key": "op_mod",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 24,
        "rowColId": "R1C6",
        "row": 1,
        "col": 6,
        "kind": "key",
        "key": "digit_0",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 25,
        "rowColId": "R1C5",
        "row": 1,
        "col": 5,
        "kind": "placeholder",
        "area": "empty"
      },
      {
        "index": 26,
        "rowColId": "R1C4",
        "row": 1,
        "col": 4,
        "kind": "key",
        "key": "unary_neg",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 27,
        "rowColId": "R1C3",
        "row": 1,
        "col": 3,
        "kind": "key",
        "key": "op_add",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 28,
        "rowColId": "R1C2",
        "row": 1,
        "col": 2,
        "kind": "key",
        "key": "op_sub",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 29,
        "rowColId": "R1C1",
        "row": 1,
        "col": 1,
        "kind": "key",
        "key": "exec_equals",
        "status": "unlock",
        "capability": "portable"
      }
    ]
  }
}

==========
----------
g'
----------

{
  "schema": "debug_calculator_snapshot_v3",
  "capturedAt": "2026-04-24T18:46:24.161Z",
  "calculatorId": "g_prime",
  "lambdaControl": {
    "alpha": 7,
    "beta": 2,
    "gamma": 12,
    "delta": 4,
    "delta_q": 4,
    "epsilon": 4
  },
  "keypad": {
    "columns": 7,
    "rows": 2,
    "keyLayoutDebug": [
      {
        "index": 0,
        "rowColId": "R2C7",
        "row": 2,
        "col": 7,
        "kind": "key",
        "key": "toggle_binary_octave_cycle",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 1,
        "rowColId": "R2C6",
        "row": 2,
        "col": 6,
        "kind": "key",
        "key": "op_mul",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 2,
        "rowColId": "R2C5",
        "row": 2,
        "col": 5,
        "kind": "key",
        "key": "op_div",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 3,
        "rowColId": "R2C4",
        "row": 2,
        "col": 4,
        "kind": "key",
        "key": "unary_reciprocal",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 4,
        "rowColId": "R2C3",
        "row": 2,
        "col": 3,
        "kind": "key",
        "key": "op_interval",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 5,
        "rowColId": "R2C2",
        "row": 2,
        "col": 2,
        "kind": "key",
        "key": "op_whole_steps",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 6,
        "rowColId": "R2C1",
        "row": 2,
        "col": 1,
        "kind": "key",
        "key": "util_clear_all",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 7,
        "rowColId": "R1C7",
        "row": 1,
        "col": 7,
        "kind": "key",
        "key": "viz_ratios",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 8,
        "rowColId": "R1C6",
        "row": 1,
        "col": 6,
        "kind": "key",
        "key": "digit_1",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 9,
        "rowColId": "R1C5",
        "row": 1,
        "col": 5,
        "kind": "key",
        "key": "digit_2",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 10,
        "rowColId": "R1C4",
        "row": 1,
        "col": 4,
        "kind": "key",
        "key": "digit_4",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 11,
        "rowColId": "R1C3",
        "row": 1,
        "col": 3,
        "kind": "key",
        "key": "digit_8",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 12,
        "rowColId": "R1C2",
        "row": 1,
        "col": 2,
        "kind": "key",
        "key": "exec_play_pause",
        "status": "unlock",
        "capability": "portable"
      },
      {
        "index": 13,
        "rowColId": "R1C1",
        "row": 1,
        "col": 1,
        "kind": "key",
        "key": "exec_step_through",
        "status": "unlock",
        "capability": "portable"
      }
    ]
  }
}