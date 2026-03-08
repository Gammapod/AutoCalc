import type { GameState } from "../../../domain/types.js";

type KatexRenderOptions = {
  displayMode?: boolean;
  throwOnError?: boolean;
};

type KatexApi = {
  render: (expression: string, element: HTMLElement, options?: KatexRenderOptions) => void;
};

const getKatexApi = (): KatexApi | undefined => {
  const scope = globalThis as typeof globalThis & { katex?: KatexApi };
  return scope.katex;
};

const getLatestSymbolicRoll = (state: GameState): NonNullable<GameState["calculator"]["rollEntries"][number]["symbolic"]> | null => {
  for (let index = state.calculator.rollEntries.length - 1; index >= 0; index -= 1) {
    const entry = state.calculator.rollEntries[index];
    if (entry.error?.code === "ALG" && entry.symbolic) {
      return entry.symbolic;
    }
  }
  return null;
};

const appendFunctionLine = (panel: HTMLElement): void => {
  if (typeof document === "undefined") {
    return;
  }
  const line = document.createElement("div");
  line.className = "v2-algebraic-function-line";
  line.textContent = "??(??) = ??";
  panel.appendChild(line);
};

export const clearAlgebraicVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderAlgebraicVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  if (!panel) {
    return;
  }

  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");
  panel.classList.add("v2-algebraic-panel--latex");

  const symbolic = getLatestSymbolicRoll(state);
  if (!symbolic) {
    panel.textContent = "No algebraic result yet";
    appendFunctionLine(panel);
    return;
  }

  if (typeof document === "undefined") {
    panel.textContent = symbolic.renderText;
    return;
  }

  const equation = document.createElement("div");
  equation.className = "v2-algebraic-equation";
  const katexApi = getKatexApi();
  if (katexApi) {
    try {
      katexApi.render(symbolic.renderText, equation, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      equation.textContent = symbolic.renderText;
    }
  } else {
    equation.textContent = symbolic.renderText;
  }
  panel.appendChild(equation);

  if (symbolic.truncated) {
    const suffix = document.createElement("div");
    suffix.className = "v2-algebraic-truncated";
    suffix.textContent = "…";
    panel.appendChild(suffix);
  }

  appendFunctionLine(panel);
};
