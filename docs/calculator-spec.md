Truth 1: Game Tuning

==========
MENU CALCULATORS
==========
----------
Menu
----------

{
  "schema": "debug_calculator_snapshot_v3",
  "capturedAt": "2026-04-18T07:30:28.848Z",
  "calculatorId": "menu",
  "lambdaControl": {
    "alpha": 1,
    "beta": 6,
    "gamma": 0,
    "delta": 1,
    "delta_q": 1,
    "epsilon": 0
  },
  "keypad": {
    "columns": 1,
    "rows": 6,
    "keyLayout": [
      {
        "kind": "key",
        "key": "viz_title"
      },
      {
        "kind": "key",
        "key": "viz_release_notes"
      },
      {
        "kind": "key",
        "key": "system_mode_game"
      },
      {
        "kind": "key",
        "key": "system_new_game"
      },
      {
        "kind": "key",
        "key": "system_mode_sandbox"
      },
      {
        "kind": "key",
        "key": "system_quit_game"
      }
    ],
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
        "status": "installed_only",
        "capability": "installed_only"
      },
      {
        "index": 3,
        "rowColId": "R3C1",
        "row": 3,
        "col": 1,
        "kind": "key",
        "key": "system_new_game",
        "status": "installed_only",
        "capability": "installed_only"
      },
      {
        "index": 4,
        "rowColId": "R2C1",
        "row": 2,
        "col": 1,
        "kind": "key",
        "key": "system_mode_sandbox",
        "status": "installed_only",
        "capability": "installed_only"
      },
      {
        "index": 5,
        "rowColId": "R1C1",
        "row": 1,
        "col": 1,
        "kind": "key",
        "key": "system_quit_game",
        "status": "installed_only",
        "capability": "installed_only"
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


==========
----------
g'
----------

