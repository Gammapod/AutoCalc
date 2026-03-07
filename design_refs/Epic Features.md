# AutoCalc Epic Features

Last updated: 2026-03-07
Scope: Long-range product plan for major feature expansions beyond current UX targets.

## 1. Feature Theme: New Calculator Unlocks

AutoCalc will eventually support unlocks that grant entirely new calculators, not just larger keypads.
These additional calculators are intended as a major progression layer and strategic system.

## 2. Design Intent

- Expand from single-device progression to multi-device workbench play.
- Let players specialize calculators for different goals (speed, precision, storage, domain tasks).
- Introduce meaningful coordination decisions across calculators.

## 3. High-Level Player Fantasy

- Early game: one mysterious machine that slowly opens up.
- Mid/late game: a bench of machines with distinct strengths and constraints.
- Endgame expression: choosing the right calculator setup for current unlock targets.

## 4. Candidate Unlock Concepts

- New calculator chassis unlock:
  Grants an additional calculator with its own keypad layout.
- Specialist calculators:
  Variants with different body size envelopes, keypad limits, or storage characteristics.
- Role-based constraints:
  Some calculators may favor width, others height, others storage/utility density.
- Coordination unlocks:
  Features that reward using multiple calculators in sequence or in parallel loops.

## 5. Expected Systems Impact

- State model expansion from a single calculator to multiple calculator instances.
- UI shell expansion to support selection, focus, and management of multiple calculators.
- Persistence schema updates for multi-instance layouts and progression metadata.
- New balancing requirements for unlock pacing, power curves, and complexity load.
- Significant additions to contract/parity tests.

## 6. Delivery Approach

This is not a short-term implementation target.
Recommended rollout is phased:

1. Define multi-calculator domain model and progression rules.
2. Introduce read-only prototype UI surfaces for additional calculators.
3. Add one unlock path for a second calculator and validate onboarding burden.
4. Expand with specialist variants only after telemetry/playtest confidence.

## 7. Relationship To Current UX Spec

Near-term work remains focused on:
- Desktop body growth/shrink with key-size safeguards.
- Mobile fixed-width body with responsive key resizing.

Multi-calculator unlocks are intentionally deferred until that baseline is stable.
