import { getLambdaDerivedValues, getLambdaUnusedPoints, toNumber } from "../../../domain/lambdaControl.js";
import type { GameState, MemoryVariable } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";

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

const selectedVectorEntry = (selectedVariable: MemoryVariable): string => {
  if (selectedVariable === "α") {
    return String.raw`{\color{#be8ee8}{[\alpha]}}`;
  }
  if (selectedVariable === "β") {
    return String.raw`{\color{#be8ee8}{[\beta]}}`;
  }
  return String.raw`{\color{#be8ee8}{[\gamma]}}`;
};

const buildEigenAllocatorLatex = (state: GameState): string => {
  const alphaEntry = state.ui.memoryVariable === "α" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\alpha`;
  const betaEntry = state.ui.memoryVariable === "β" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\beta`;
  const gammaEntry = state.ui.memoryVariable === "γ" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\gamma`;
  const derived = getLambdaDerivedValues(state.lambdaControl);
  const delta = derived.deltaEffective;
  const epsilon = toDisplayString(derived.epsilonEffective);
  const epsilonFloat = toNumber(derived.epsilonEffective);
  const unused = getLambdaUnusedPoints(state.lambdaControl);
  return String.raw`
\text{ALLOCATOR ~,==,"<}\\[10pt]
\begin{bmatrix}
${alphaEntry}\\
${betaEntry}\\
${gammaEntry}\\
\delta\\
\epsilon
\end{bmatrix}
\times
\begin{bmatrix}
${alphaEntry}&0&0&0&0\\
0&${betaEntry}&0&0&0\\
0&0&${gammaEntry}&0&0\\
0.5&0.5&1&\delta&0\\
0.1&0.1&0.1&0.1&\epsilon
\end{bmatrix}
=
\begin{bmatrix}
\lambda{\leftrightarrow}\\
\lambda{\updownarrow}\\
\lambda{[\text{\_ \_}]}\\
\lambda{[-\delta,\delta]}\\
\lambda{\frac{\Delta T}{1.05^\epsilon}}
\end{bmatrix}
`;
};

export const clearEigenAllocatorVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-eigen-allocator-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderEigenAllocatorVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-eigen-allocator-panel]");
  if (!panel) {
    return;
  }

  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");
  panel.classList.add("v2-eigen-allocator-panel--latex");

  if (typeof document === "undefined") {
    panel.textContent = "lambda control";
    return;
  }
  const equation = document.createElement("div");
  equation.className = "v2-eigen-equation";
  const katexApi = getKatexApi();
  const latex = buildEigenAllocatorLatex(state);
  if (katexApi) {
    try {
      katexApi.render(latex, equation, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      equation.textContent = "lambda control";
    }
  } else {
    equation.textContent = "lambda control";
  }
  panel.appendChild(equation);
};
