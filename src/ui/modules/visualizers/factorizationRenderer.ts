import type { PrimeFactorTerm } from "../../../domain/types.js";
import type { GameState } from "../../../domain/types.js";

const FACTORIZATION_PLACEHOLDER = "not factorable";
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

const toSuperscriptNumber = (value: number): string =>
  value
    .toString()
    .split("")
    .map((digit) => SUPERSCRIPT_DIGITS[digit] ?? digit)
    .join("");

const formatTerms = (terms: PrimeFactorTerm[]): string => {
  if (terms.length === 0) {
    return "1";
  }
  return terms
    .map((term) => `${term.prime.toString()}${toSuperscriptNumber(term.exponent)}`)
    .join(" × ");
};

const formatStoredFactorization = (entry: GameState["calculator"]["rollEntries"][number]): string => {
  if (!entry.factorization) {
    return FACTORIZATION_PLACEHOLDER;
  }
  const numerator = formatTerms(entry.factorization.numerator);
  if (entry.factorization.denominator.length === 0) {
    return `${entry.factorization.sign < 0 ? "-" : ""}${numerator}`;
  }
  const denominator = formatTerms(entry.factorization.denominator);
  return `${entry.factorization.sign < 0 ? "-" : ""}(${numerator}) / (${denominator})`;
};

export const clearFactorizationVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderFactorizationVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const latest = state.calculator.rollEntries.at(-1);
  const rowText = latest ? formatStoredFactorization(latest) : FACTORIZATION_PLACEHOLDER;

  if (typeof document === "undefined") {
    panel.textContent = rowText;
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-factorization-table";
  const row = document.createElement("div");
  row.className = "v2-factorization-row";
  row.textContent = rowText;
  if (rowText === FACTORIZATION_PLACEHOLDER) {
    row.classList.add("v2-factorization-row--placeholder");
  }
  table.appendChild(row);
  panel.appendChild(table);
};
