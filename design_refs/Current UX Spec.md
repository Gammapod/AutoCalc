# AutoCalc Current UX Spec

Last updated: 2026-03-07
Scope: Active UX direction for calculator resizing behavior across desktop and mobile shells.

## 1. Purpose

This document defines the current intended UX behavior for keypad growth and calculator body sizing.
It is the short-range target for implementation and polish.

## 2. Platform Strategy

AutoCalc intentionally uses platform-specific layout behavior while preserving gameplay parity.

Desktop strategy:
- Calculator body width and height may grow or shrink with keypad dimensions.
- Key size should stay within a usable, stable range and avoid becoming tiny as columns increase.
- Visual goal: machine footprint expansion reads as physical hardware growth.

Mobile strategy:
- Calculator body width remains fixed to the mobile shell panel width.
- Keypad grid resizes keys within that fixed body as rows/columns change.
- Visual goal: preserve one-handed and thumb-friendly flow within viewport constraints.

## 3. Sizing Direction

Desktop (primary direction):
- Enforce a minimum key width threshold.
- When additional columns would push keys below that threshold, increase calculator body width instead.
- Continue allowing body height changes for row upgrades.

Mobile (primary direction):
- Keep calculator body width fixed.
- Allow key width/height to compress or expand with keypad dimensions, within mobile tap-target safeguards.

## 4. UX Rationale

- Desktop gains stronger progression readability because upgrades change machine footprint, not just key density.
- Mobile avoids horizontal overflow and preserves shell stability in drawer-based navigation.
- Both platforms keep domain/reducer/unlock outcomes equivalent while allowing visual/layout divergence.

## 5. Constraints

- Gameplay semantics and progression logic remain platform-invariant.
- Persistence schema should not require changes for this UX policy alone.
- Touch and drag/rearrange interactions must remain usable on smaller keys in mobile mode.

## 6. Out of Scope

- Multi-calculator unlock systems.
- Parallel calculator execution loops.
- Calculator class/loadout systems.

Those long-range ideas are tracked in `Epic Features.md`.
