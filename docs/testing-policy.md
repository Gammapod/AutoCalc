Truth: 1 - Testing Policy

# Testing Policy

Tests protect behavior, invariants, interfaces, and cross-boundary consistency. They must not become a second source of truth for authored contracts.

## Source-of-Truth Rule

Canonical catalogs, manifests, specs, matrices, presets, CSS/token definitions, and authored content are contracts. Tests may validate how code consumes those contracts, but tests must not restate the contract's exact contents as hard-coded expected data.

If a canonical contract changes intentionally, tests should fail only when the consuming behavior, structural invariant, or cross-boundary wiring is wrong. Tests should not fail merely because the authored contract now contains different keys, positions, order, text, IDs, colors, dimensions, or counts.

## Disallowed Test Patterns

Do not write tests that:

- Assert exact seeded keypad placements, blank cells, calculator order, dimensions, lambda starts, or preset membership already authored in a canonical manifest or preset.
- Assert exact registry/catalog entry lists, counts, order, IDs, labels, descriptions, release-note text, storage indexes, visualizer IDs, CSS selectors, token names, or color values unless the test is explicitly verifying a generated artifact against a separate higher-truth source.
- Treat tests as approval gates for intentional authored-content changes.
- Duplicate a matrix/spec table as hard-coded test cases when the table itself is the source of truth.
- Require updating assertions every time a canonical content/layout/tuning document is edited without a runtime behavior change.

## Allowed Test Patterns

Prefer tests that:

- Check structural invariants: uniqueness, referential integrity, valid IDs, supported enum values, non-empty required fields, sorted/deterministic output when determinism is required, and no dangling references.
- Check cross-boundary consistency: one catalog references another correctly, a generated adapter matches its canonical source, a renderer consumes a manifest entry without crashing, or a preset materializes every ID declared by its manifest.
- Check behavior from a discovered fixture: find the relevant key/calculator/entry from the canonical contract, then verify runtime behavior, reducer effects, rendering semantics, persistence, or protocol shape.
- Check negative behavior and malformed inputs using local test fixtures that are intentionally not canonical app content.
- Check user-visible semantics rather than implementation spellings: state transitions, accepted/rejected actions, accessibility roles, UI effects, serialized protocol fields, and mathematical results.

## Contract Tests

Contract tests are allowed when they enforce a relationship between two independent surfaces. A good contract test says "these surfaces must agree" or "this consumer must handle every canonical entry." A bad contract test says "this canonical surface must keep these exact authored values."

Examples:

- Good: every key in the key catalog has presentation metadata.
- Good: every diagnostics entry references a known key, and every known key has diagnostics copy.
- Good: a generated runtime catalog derives from the canonical key catalog.
- Bad: the seed manifest must contain `digit_1` at row 3, column 1.
- Bad: sandbox `h_prime` row 4, column 3 must be `op_rotate_15`.
- Bad: a CSS file must contain a specific selector string because the selector is currently written that way.

## Regression Tests

Regression tests should capture the smallest behavior that would have caught the bug. If the bug was caused by a contract consumer mishandling data, test the consumer with a focused fixture or by deriving expected values from the canonical contract. Do not freeze the contract data itself unless the contract is not canonical and the fixed value is the product behavior.

## Fixture Guidance

When a test needs exact data, define a local fixture inside the test or helper and make clear that the fixture is part of the test scenario, not a mirror of production content.

When a test needs production content, derive expectations from the canonical production content and assert general properties or behavior around those derived values.

## Review Checklist

Before adding or updating a test, ask:

- What behavior or invariant is this protecting?
- Is the expected value copied from the same canonical source the code reads?
- Would this fail after an intentional content/layout/tuning edit with no behavior regression?
- Can the expectation be derived from the canonical contract instead?
- Would a small local fixture test the behavior more directly?

If the answer shows the test is only freezing authored contract contents, rewrite it or remove it.
