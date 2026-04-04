import type { GameState } from "../../../domain/types.js";
import { buildAlgebraicViewModel } from "../../shared/readModel.js";
import { ensureKatexLoaded } from "../../../infra/runtime/lazyAssetLoader.js";

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

const appendBuilderRow = (panel: HTMLElement, functionText: string, seedText: string): void => {
  if (typeof document === "undefined") {
    return;
  }
  const row = document.createElement("div");
  row.className = "v2-algebraic-builder-row";

  const functionLine = document.createElement("div");
  functionLine.className = "v2-algebraic-builder-function";
  functionLine.textContent = functionText;
  row.appendChild(functionLine);

  const seedLine = document.createElement("div");
  seedLine.className = "v2-algebraic-builder-seed";
  seedLine.textContent = seedText;
  row.appendChild(seedLine);

  panel.appendChild(row);
};

const appendTruncationIndicator = (panel: HTMLElement): void => {
  if (typeof document === "undefined") {
    return;
  }
  const marker = document.createElement("div");
  marker.className = "v2-algebraic-truncated";
  marker.textContent = "...";
  marker.setAttribute("aria-label", "Visualizer content compacted to fit");
  panel.appendChild(marker);
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

  const model = buildAlgebraicViewModel(state);

  if (typeof document === "undefined") {
    panel.textContent = `${model.recurrenceLine} | ${model.seedLine}\n${model.mainLine}`;
    return;
  }

  appendBuilderRow(panel, model.recurrenceLine, model.seedLine);

  const equation = document.createElement("div");
  equation.className = "v2-algebraic-equation";
  const katexApi = getKatexApi();
  if (!katexApi) {
    void ensureKatexLoaded().then((loaded) => {
      if (!loaded) {
        return;
      }
      renderAlgebraicVisualizerPanel(root, state);
    });
  }
  if (katexApi) {
    try {
      katexApi.render(model.mainLine, equation, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      equation.textContent = model.mainLine;
    }
  } else {
    equation.textContent = model.mainLine;
  }
  panel.appendChild(equation);
  if (model.mainLine.length > 120 || model.recurrenceLine.length > 90) {
    appendTruncationIndicator(panel);
  }
};
