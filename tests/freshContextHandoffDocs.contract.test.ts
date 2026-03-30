import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readHandoffDocs = (): {
  template: string;
  runbook: string;
  prompt: string;
  checklist: string;
} => ({
  template: readFileSync(resolve(process.cwd(), "docs/planning/templates/fresh-context-handoff-template.md"), "utf8"),
  runbook: readFileSync(resolve(process.cwd(), "docs/runbook-fresh-context-handoff.md"), "utf8"),
  prompt: readFileSync(resolve(process.cwd(), "docs/planning/templates/fresh-context-spawn-prompt.md"), "utf8"),
  checklist: readFileSync(resolve(process.cwd(), "docs/planning/templates/fresh-context-handoff-checklist.md"), "utf8"),
});

export const runFreshContextHandoffDocsContractTests = (): void => {
  const { template, runbook, prompt, checklist } = readHandoffDocs();

  assert.equal(
    template.includes("## Objective") &&
      template.includes("## Phase Model (required)") &&
      template.includes("Planning Phase") &&
      template.includes("Implementation Phase") &&
      template.includes("## User Story Slices") &&
      template.includes("## Invariant/Truth 1 Updates") &&
      template.includes("## Locked Decisions") &&
      template.includes("## Required Inputs") &&
      template.includes("## Explicit Out Of Scope") &&
      template.includes("## Required Output Schema"),
    true,
    "handoff template includes required phase-aware sections",
  );
  assert.equal(
    template.includes("1. Findings") &&
      template.includes("2. Gaps") &&
      template.includes("3. Risks (blocking / non-blocking)") &&
      template.includes("4. Implementation Plan") &&
      template.includes("5. Test Plan") &&
      template.includes("6. Open Questions"),
    true,
    "handoff template defines required output order",
  );

  assert.equal(
    runbook.includes("fork_context: false"),
    true,
    "runbook requires fresh-context spawn configuration",
  );
  assert.equal(
    runbook.includes("## Phase Definitions") &&
      runbook.includes("Planning Phase") &&
      runbook.includes("Implementation Phase"),
    true,
    "runbook defines planning and implementation phases",
  );
  assert.equal(
    runbook.includes("read-only review by default"),
    true,
    "runbook defines default read-only review behavior",
  );
  assert.equal(
    runbook.includes("Handoff Readiness Checklist") &&
      runbook.includes("Handoff Acceptance Checklist"),
    true,
    "runbook includes both readiness and acceptance checklists",
  );

  assert.equal(
    prompt.includes("Use with `fork_context: false`.") &&
      prompt.includes("You are a fresh reviewer. Do not assume prior thread context.") &&
      prompt.includes("If mode is review: do not modify files."),
    true,
    "spawn prompt enforces fresh-context and review-mode behavior",
  );
  assert.equal(
    prompt.includes("1. Findings") &&
      prompt.includes("6. Open Questions"),
    true,
    "spawn prompt includes output schema contract",
  );

  assert.equal(
    checklist.includes("Sender Readiness") &&
      checklist.includes("Receiver Acceptance") &&
      checklist.includes("fork_context: false"),
    true,
    "checklist includes sender/receiver gates and fresh-context requirement",
  );
};
