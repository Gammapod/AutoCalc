Recommended stack
Build tooling

Vite + TypeScript
Fast dev server, simple build pipeline, minimal ceremony.

UI approach (pick one)
Option A: Vanilla DOM + TypeScript (default recommendation)
For a calculator UI, this is straightforward and avoids framework overhead.
You’ll have a small set of event handlers + a single render(state) function.

Option B: Svelte + TypeScript
If you want reactive UI without React-style complexity.
Less boilerplate; feels closer to “UI as a function of state.”

Numeric model
BigInt-first internal representation (even if MVP caps at 12 digits)
Keeps the “exactness/number theory” identity intact.
Avoids a painful migration later.

Storage
localStorage for MVP (simple)
Upgrade path: IndexedDB if you start storing lots of challenge history / automation scripts.
Testing & hygiene (lightweight)
Vitest (unit tests)
ESLint + Prettier (so the code stays readable even when AI generates chunks)

Core implementation shape
1) Separate “game logic” from “UI”

Make your codebase two worlds:

- Game module (pure logic)
- Defines state, rules, transitions, validators.
- No DOM, no rendering, no browser APIs (except time and persistence via adapters).
- UI module
- Renders state
- Sends inputs (button presses, upgrade purchases)
- Displays feedback, errors, challenge status

This structure is what keeps the project reviewable and prevents “JS sprawl.”

2) Use a deterministic state machine

Define your entire game as:

- state: GameState
- dispatch(action): state'
- Actions like:
- PRESS_KEY("1")
- PRESS_KEY("+")
- EQUALS()
- BUY_UNLOCK("digit_7")
- START_CHALLENGE(id)
- SUBMIT_CHALLENGE_RESULT(...)

Even if you don’t implement all actions in MVP, designing around this prevents ad-hoc rules creeping into UI callbacks.

3) Exact arithmetic model: BigInt + calculator semantics

Treat the calculator as its own mini-engine:

- Input buffer (what’s on the display)
- Pending operator
- Accumulator / last value
- “Error/overflow” state

And keep it integer-only for as long as your puzzle design remains number-theory-centered.

Overflow for MVP:

If abs(value) > 999_999_999_999n (12 digits), enter ERROR (or clamp, but error is more “calculator-authentic”).
This makes correctness easy, and it aligns with your “literal calculator” framing.

4) Idle/incremental simulation: tick with delta time, but don’t overthink it

For MVP:

Run a loop that updates “earned currency” based on elapsed time.
Update at ~10–20 Hz for simulation, and render at animation frame rate if you want smooth display.

Key idea:

Simulation doesn’t need to be 60 fps.
Rendering can be decoupled from simulation.
This matters later when you add automation and challenge validation—your logic stays stable.

5) Challenges are validators, not scripted sequences

Given your design, model each challenge as:

- A goal predicate (e.g., “reach target X”)
- A constraint predicate (e.g., “never hit multiple of 5”)
- A trace requirement (needs access to the sequence of intermediate values / operations)
- So your game state should optionally maintain a trace log of:
- operations entered
- intermediate display values
- timestamps (optional)

This makes constraints like “never hit a multiple of five anywhere in between” implementable as pure checks.

6) Automation should be a “program” acting on the same input API

When you get there:

Automation shouldn’t mutate state directly.
It should “press keys” through the same action interface the player uses.
That keeps puzzles honest and makes it easy to validate runs (manual vs automated is just a different input source).

7) Save format from day 1

Even in MVP, define a single JSON save blob:

- version number
- unlocked keys/features
- current currency
- calculator state (display, buffer, pending op)
- current challenge progress (if any)

Keep it explicit, and add migration functions later.

Concrete project layout

src/game/
state.ts (types + initial state)
reducer.ts (dispatch / transitions)
calc.ts (calculator semantics, exact integer ops)
sim.ts (idle tick/update rules)
challenges.ts (challenge definitions + validators)
save.ts (serialize/deserialize + versioning)

src/ui/
render.ts (render state → DOM)
events.ts (wire buttons → actions)
index.ts (boot: load save, start loops)

This keeps AI-generated code corralled and reviewable.

MVP Clarifications (added 2026-02-22)
- Numeric limit for MVP: 12 digits maximum (overflow threshold remains abs(value) > 999_999_999_999n).
- MVP uses one currency only: the calculator display value. Ignore separate idle-earned currency for MVP.
- MVP win condition: trigger display overflow (attempt to represent a value beyond 12 digits).
- Calculator semantics (operator behavior, repeated equals, divide behavior, negatives) are intentionally unresolved and will be finalized during MVP prototyping.
- Unlock balancing (order, prices, progression curve) is intentionally unresolved for MVP.
- First-slice implementation requirement: include debug commands/events to directly fire unlock events for implemented unlockables.
- Challenge system implementation details are deferred to a post-MVP phase.
- Offline progress behavior is deferred to a post-MVP phase.
- Document encoding note: mojibake characters in earlier lines were unintentional; this addendum preserves original text and records corrections without rewriting prior content.
