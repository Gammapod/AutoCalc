# New unlock conditions:

memory_adjust_plus unlocked the first time a lambda point is awarded
memory_cycle_variable unlocked the first time a lambda point is spent
viz_eigen_allocator unlocked the first time a lambda point is refunded
viz_feed unlocked the first time the roll length is over 20
exec_play_pause unlocked the first time the roll length is over 40
util_backspace unlocked the first time a C clears a function with 2 filled operation slots
util_undo unlocked the first time a NaN is returned
exec_roll_inverse unlocked the first time the undo utility is used while feed visualizer is displayed
op_mod unlocked the first time a cycle with length > 2 is found on the roll
toggle_mod_zero_to_delta unlocked the first time an overflow occurs while in base-2 mode

calculator g (the binary calculator) unlocked the first time a run of 7 contains only powers of 2

Also:
calculator g should appear when unlocked (including through the debug unlock option)
New initial state of calculator g's keypad layout (by relative key#):
R2C2 - toggle_binary_mode 
R2C1 - exec_step_through
R1C1 - unary_not 
All keys still locked

Lambda points awarded to calculator f under these conditions:
- first time a transient with length > 10 is found
- first time a cycle with diameter > 10 is found
- first time a cycle with length > 5 is found

Lambda points awarded to calculator g under these conditions:
- first time addition is used while in base-2 mode and the result is 1
- first time multiplication is used while in base-2 mode and the result is 0


# New UX styles/key families:

Visualizers and settings keys should now belong to a single "settings" key family
- subgroups are determined by mutual exclusivity families - visualizers are still one subgroup, and so are the two mod/wrap settings, with [ ??? ] and base-2 being solo/independent settings for now (but both will eventually have sibling keys)
- all settings keys are blue (darker than the current visualizer color)
- all settings keys have a stripe on the bottom - the key's textface and the stripe's color are different depending on the mutual exclusivity group it belongs to
- visualizer keys have a light blue stripe and text
- mod/wrap settings keys have a yellow stripe and text
- [ ??? ] has a purple stripe and text
- base-2 has an orange stripe and text

Second change: Binary operators should have a stripe on the right instead of bottom.

# New key family: global system/game control
muddy brown/ochre color with white text
Keys include:
- "New Game" - switches to game mode, with initialized calculator/unlock state
- "Continue" - switches to game mode, loading save as normal
- "Sandbox" - switches to sandbox mode
- "Save&Quit" - saves game and switches to main menu mode (Key face:`🖫➠⛭` )
- "Quit Game" - closes the application

The specific non-functional behavior/ux animations associated with these actions are tbd

# New visualizer key: Menu
This visualizer displays:
- Game version in the top left corner, in the form of: "v*.*.*"
- "AutoCalc" in large text in the center

# New mode, "Main Menu"

Peer mode to game and sandbox modes
Initial state:
- Starts with f and g both locked
- Starts with calculator "Menu" (new peer to f and g) unlocked and visible (see allocator planning doc)
- Menu calculator has set constants for all lambda controls, none settable: alpha - 1 | beta - 5 | gamma, delta, epsilon - 0
- Initial keypad state, from top to bottom:
 - Menu visualizer
 - Continue
 - New Game
 - Sandbox
 - Quit Game

# Change to initial game state:
f calculator:
- matrix values and relationships changed (see allocator planning doc)
- key placement: 
 - #0 = Save&Quit
 - #1 = (blank)
 - #2 = (blank)
 - #3 = (blank)
 - #4 = unary_inc
 - #5 = exec_equals
 

# Hint system:

First ensure that unlock conditions that happen over multiple roll rows can emit partial success - ie, if an unlock condition checks the last 7 roll entries, we need to be able to tell if a condition is true for the past 3, 4, 5, etc entries are a partial match.

Then, a new UX element on the default visualizer: an indicator that fills in based on whether anything is close to unlocking, filled proportionally to the number of matching entries.

This would act as a radar for “you’re near something” without explicitly stating the condition.

## Out of scope: adding hints to other visualizers as well, depending on unlock conditions.

# Edits/replacement for the roll analysis visualizer
This will act as a diagnostic panel; its specific layout and ui details are not settled, but the main information categories are fairly cut-and-dry:

## Last Key
A written description explaining what the most recent key does. unfilled_gap: need to determine how to show information about visualizers, since pressing one will turn off the help screen
## Next Operation
Shows the current operation (next in line for step-through behavior) in words, and accompanying algebraic descriptions/equalities. specifics pending
## Orbit Analysis
Shows orbit analysis details, including:
- the length of the transient (thus far if not cycle)
- the growth order of the transient
- whether a cycle has been found
- the diameter and range, if cycle was detected
## Domain 
A written description of the current number's detected domain.
## Prime Factorization
The factorizations of the current function's seed and latest row.