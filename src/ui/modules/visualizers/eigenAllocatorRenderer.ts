import type { GameState, MemoryVariable } from "../../../domain/types.js";

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
  if (selectedVariable === "\u03B1") {
    return String.raw`{\color{#be8ee8}{[\alpha]}}`;
  }
  if (selectedVariable === "\u03B2") {
    return String.raw`{\color{#be8ee8}{[\beta]}}`;
  }
  return String.raw`{\color{#be8ee8}{[\gamma]}}`;
};

const buildEigenAllocatorLatex = (selectedVariable: MemoryVariable): string => {
  const alphaEntry = selectedVariable === "\u03B1" ? selectedVectorEntry(selectedVariable) : String.raw`\alpha`;
  const betaEntry = selectedVariable === "\u03B2" ? selectedVectorEntry(selectedVariable) : String.raw`\beta`;
  const gammaEntry = selectedVariable === "\u03B3" ? selectedVectorEntry(selectedVariable) : String.raw`\gamma`;
  return String.raw`

EIGEN ALLOCATOR | ~,==,"< \\\\[12pt]

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
\lambda{\frac{\Delta T}{\epsilon}}
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
    panel.textContent = "||v|| x ||A|| = ||\u03BB||";
    return;
  }
  const equation = document.createElement("div");
  equation.className = "v2-eigen-equation";
  const katexApi = getKatexApi();
  const latex = buildEigenAllocatorLatex(state.ui.memoryVariable);
  if (katexApi) {
    try {
      katexApi.render(latex, equation, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      equation.textContent = "||v|| x ||A|| = ||\u03BB||";
    }
  } else {
    equation.textContent = "||v|| x ||A|| = ||\u03BB||";
  }
  panel.appendChild(equation);
};
