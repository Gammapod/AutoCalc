import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readUiCssContractSources = (): { html: string; css: string } => ({
  html: readFileSync(resolve(process.cwd(), "index.html"), "utf8"),
  css: readFileSync(resolve(process.cwd(), "styles/key-visual-affordance.css"), "utf8"),
});

export const runUiVisualizerFitContractTests = (): void => {
  const { html, css } = readUiCssContractSources();
  const source = `${html}\n${css}`;

  assert.equal(
    /v2-algebraic-equation[^}]*overflow-x:\s*auto;/.test(html),
    false,
    "algebraic visualizer does not use horizontal scroll fallback",
  );
  assert.equal(
    /v2-eigen-equation[^}]*overflow-x:\s*auto;/.test(html),
    false,
    "eigen visualizer does not use horizontal scroll fallback",
  );
  assert.equal(
    /v2-factorization-table[^}]*overflow-y:\s*auto;/.test(html),
    false,
    "factorization visualizer does not use vertical scroll fallback",
  );
  assert.equal(
    html.includes("data-v2-fit-overflow"),
    true,
    "visualizer host CSS contract includes fit-overflow state selector",
  );
  assert.equal(
    html.includes("--v2-visualizer-baseline-offset"),
    true,
    "visualizer host defines a shared resting baseline offset token",
  );
  assert.equal(
    html.includes("data-v2-total-footer"),
    true,
    "visualizer host markup includes shared total footer container",
  );
  assert.equal(
    html.includes('<link rel="stylesheet" href="./styles/key-visual-affordance.css" />'),
    true,
    "index includes dedicated key visual affordance stylesheet",
  );
  assert.equal(
    css.includes('.key.key--group-settings[data-key^="viz_"]'),
    true,
    "settings CSS defines visualizer subgroup stripe selector",
  );
  assert.equal(
    css.includes('.key.key--group-settings[data-key="toggle_delta_range_clamp"]'),
    true,
    "settings CSS defines mod-wrap subgroup stripe selector",
  );
  assert.equal(
    css.includes('.key.key--group-settings[data-key="toggle_step_expansion"]'),
    true,
    "settings CSS defines step-expansion subgroup stripe selector",
  );
  assert.equal(
    css.includes('.key.key--group-settings[data-key="toggle_binary_mode"]'),
    true,
    "settings CSS defines base-2 subgroup stripe selector",
  );
  assert.equal(
    css.includes("transparent calc(80% - 1px)"),
    true,
    "settings subgroup stripes retain bottom placement in CSS",
  );
  assert.equal(
    html.includes("--settings-subgroup-visualizers-stripe-off") &&
      html.includes("--settings-subgroup-mod-wrap-stripe-off") &&
      html.includes("--settings-subgroup-step-expansion-stripe-off") &&
      html.includes("--settings-subgroup-base2-stripe-off"),
    true,
    "settings subgroup stripe off-state tokens are defined",
  );
  assert.equal(
    css.includes("var(--settings-subgroup-visualizers-stripe-off)") &&
      css.includes("var(--settings-subgroup-mod-wrap-stripe-off)") &&
      css.includes("var(--settings-subgroup-step-expansion-stripe-off)") &&
      css.includes("var(--settings-subgroup-base2-stripe-off)"),
    true,
    "settings subgroup stripes use darkened off-state colors when untoggled",
  );
  assert.equal(
    html.includes("--settings-subgroup-visualizers-stripe-on") &&
      html.includes("--settings-subgroup-mod-wrap-stripe-on") &&
      html.includes("--settings-subgroup-step-expansion-stripe-on") &&
      html.includes("--settings-subgroup-base2-stripe-on") &&
      css.includes("var(--settings-subgroup-visualizers-stripe-on) 100%") &&
      css.includes("var(--settings-subgroup-mod-wrap-stripe-on) 100%") &&
      css.includes("var(--settings-subgroup-step-expansion-stripe-on) 100%") &&
      css.includes("var(--settings-subgroup-base2-stripe-on) 100%"),
    true,
    "settings subgroup stripes retain bright on-state colors for toggle-active styling",
  );
  assert.equal(
    css.includes('.key.key--group-slot_operator:not(.key--unary-operator)::after'),
    true,
    "binary operator key family defines a binary-only corner accent selector",
  );
  assert.equal(
    css.includes("clip-path: polygon(100% 0, 100% 100%, 0 100%)"),
    true,
    "binary operator key family corner accent uses the expected triangular geometry",
  );
  assert.equal(
    css.includes("height: 50%;") && css.includes("aspect-ratio: 1 / 1;"),
    true,
    "binary operator corner triangle intersects midway on right and bottom edges",
  );
  assert.equal(
    /key--group-slot_operator:not\(\.key--unary-operator\)::after[\s\S]*background:\s*linear-gradient\(180deg,\s*var\(--key-top\),\s*var\(--key-bottom\)\);/.test(source),
    true,
    "binary operator corner accent uses the same white gradient family as default keycaps",
  );
  assert.equal(
    css.includes('.key.key--toggle-active.key--group-slot_operator:not(.key--unary-operator):not(:disabled)::after'),
    true,
    "binary operator active-state corner accent remains binary-only",
  );
  assert.equal(
    /toggle-active\.key--group-slot_operator:not\(\.key--unary-operator\):not\(:disabled\)::after[\s\S]*background:\s*linear-gradient\(180deg,\s*var\(--key-bottom\),\s*var\(--key-top\)\);/.test(source),
    true,
    "binary operator active-state corner accent inverts like default keycaps",
  );
};

