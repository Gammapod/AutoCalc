📘 AutoCalc — MVP Design Summary
Core Concept
A calculator-themed incremental game that begins as simple number accumulation and gradually reveals deeper mathematical structure.
The game is ultimately about:
Mathematical elegance under constraint
Expanding expressive arithmetic power
Insight becoming progression
Scale is present, but not the primary identity.
Core Fantasy
Early:
“How high can I push this number?”
Later:
“What can I construct within these arithmetic constraints?”
Eventually:
“I understand how this mathematical space behaves.”
The calculator is not decorative — it is the rule-bound environment.
Interface & Fiction
A literal calculator interface
10-digit display
Standard operations (eventually unlockable)
Realistic button model
Display max matters
The fiction begins grounded and literal.
Phase Structure (Intended Arc)
Phase 1 — Primitive Accumulation
Only 1 and + are available
Player manually builds numbers: 1+1+1+1…
Accumulated total can be spent
Focus:
Scarcity
Basic arithmetic embodiment
Unlock progression
Phase 2 — Expressive Expansion
Additional digits unlock
Additional operations unlock
Possibly advanced functions unlock
Display cap can be expanded
Focus:
Expanding arithmetic language
Tool acquisition
Increased expressive capability
Phase 3 — Constraint Challenges (Core Identity)
The primary game emerges here.
Challenges involve reaching specific goals under constraints, such as:
Reach the smallest non-zero number without divide
Reach max without hitting a multiple of five
Use advanced functions to satisfy constraints
Demonstrate understanding of growth differences (e.g., quadratic vs exponential)
Focus:
Mathematical structure
Optimization under tool limits
Insight and elegance
Deliberate construction
Completion of challenges may unlock:
New functions
Automation tools
Further expressive expansion
Phase 4 — Scale Transcendence (Occasional Mode)
Some challenges may involve:
Smashing normal numeric limits
Conceptual scale (e.g., Graham’s number)
Understanding extreme growth classes
Scale serves as:
Awe
Contrast
Demonstration of structural math knowledge
But it is not the primary loop.
Core Design Pillars
Literal calculator constraints matter.
Progression expands arithmetic expressiveness.
The game transitions from accumulation to elegance.
Insight becomes the dominant progression driver.
Automation supports, but does not replace, mathematical reasoning.
Scale is thematic amplification, not the sole objective.
Genre Shape
Hybrid of:
Incremental/idle (early scaffolding)
Constraint puzzle (core identity)
Arithmetic sandbox
Mathematical optimization
The player both:
Solves challenges manually
Designs automated constructions
MVP Scope (Agreed Constraints)
Designed to be completable in ~15 minutes
Starts with only 1 and +
Additional keys unlock through spending accumulated total
Standard calculator model
Clear completion state (initial maxing-out loop)
Constraint-based challenges introduced as the deeper layer
No prestige loops defined yet. No meta-layer defined yet. No expansion layers beyond MVP committed.
Design Spine (Condensed)
A constrained calculator where arithmetic power expands over time, and the player transitions from brute accumulation to elegant mathematical construction under constraints.

MVP Clarifications (added 2026-02-22)
- For MVP, the effective display maximum is 12 digits.
- MVP economy uses one currency only: the calculator display value.
- MVP winning condition: display overflow (attempting to exceed 12-digit representable values).
- Standard-calculator semantic details are intentionally unresolved for MVP and will be decided during prototyping.
- Unlock order, pricing, and balancing are intentionally unresolved for MVP.
- MVP first slice should support debug-triggered unlock events for any implemented unlockables.
- Challenge implementation specifics are deferred beyond MVP.
- Offline progress is deferred beyond MVP.
- Document encoding note: earlier mojibake artifacts were unintentional; existing lines are preserved and corrections are recorded additively here.
