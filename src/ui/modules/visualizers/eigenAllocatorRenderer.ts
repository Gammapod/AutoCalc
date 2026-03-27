import { projectControlFromState } from "../../../domain/controlProjection.js";
import type { ControlField, GameState, MemoryVariable } from "../../../domain/types.js";
import { toDisplayString } from "../../../infra/math/rationalEngine.js";
import { normalizeSelectedControlField } from "../../../domain/controlSelection.js";

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

const CONTROL_FIELDS: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];

const formatMatrixNumber = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
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

const buildEigenAllocatorLatex = (state: GameState): string => {
  const projection = projectControlFromState(state);
  const selectedControlField = normalizeSelectedControlField(
    projection.profile,
    state.ui.selectedControlField,
    state.ui.memoryVariable,
  );
  const alphaEntry = selectedControlField === "alpha" ? selectedVectorEntry("\u03B1") : String.raw`\alpha`;
  const betaEntry = selectedControlField === "beta" ? selectedVectorEntry("\u03B2") : String.raw`\beta`;
  const gammaEntry = selectedControlField === "gamma" ? selectedVectorEntry("\u03B3") : String.raw`\gamma`;
  const matrixRows = CONTROL_FIELDS.map((target) => {
    const eq = projection.profile.equations[target];
    return CONTROL_FIELDS.map((source) => formatMatrixNumber(eq.coefficients[source])).join("&");
  }).join(String.raw`\\`);
  const inputVector = [
    formatMatrixNumber(projection.fields.alpha),
    formatMatrixNumber(projection.fields.beta),
    formatMatrixNumber(projection.fields.gamma),
    formatMatrixNumber(projection.fields.delta),
    formatMatrixNumber(projection.fields.epsilon),
  ].join(String.raw`\\`);
  const outputVector = [
    String.raw`\alpha'=${projection.fields.alpha.toString()}`,
    String.raw`\beta'=${projection.fields.beta.toString()}`,
    String.raw`\gamma'=${projection.fields.gamma.toString()}`,
    String.raw`\delta'=${projection.fields.delta.toString()}`,
    String.raw`\epsilon'=${projection.fields.epsilon.toString()}`,
  ].join(String.raw`\\`);

  return String.raw`
\text{ALLOCATOR CONTROL MATRIX}\\[8pt]
\begin{bmatrix}
${alphaEntry}\\
${betaEntry}\\
${gammaEntry}\\
\delta\\
\epsilon
\end{bmatrix}
\times
\begin{bmatrix}
${matrixRows}
\end{bmatrix}
=
\begin{bmatrix}
${inputVector}
\end{bmatrix}
`;
};

const buildCompactAllocatorSummary = (state: GameState): string => {
  const projection = projectControlFromState(state);
  const epsilon = toDisplayString(projection.epsilonEffective);
  return [
    `alpha=${projection.fields.alpha.toString()}`,
    `beta=${projection.fields.beta.toString()}`,
    `gamma=${projection.fields.gamma.toString()}`,
    `delta=${projection.deltaEffective.toString()}`,
    `epsilon=${epsilon}`,
    `lambda=${projection.budget.unused.toString()}`,
  ].join(" | ");
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
      if (equation.clientWidth > 0 && equation.scrollWidth > equation.clientWidth) {
        equation.textContent = buildCompactAllocatorSummary(state);
      }
    } catch {
      equation.textContent = buildCompactAllocatorSummary(state);
    }
  } else {
    equation.textContent = buildCompactAllocatorSummary(state);
  }
  panel.appendChild(equation);
};
