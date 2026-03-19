import { getLambdaDerivedValues } from "../../../domain/lambdaControl.js";
import { getEffectiveControlProfile } from "../../../domain/controlProfileRuntime.js";
import type { ControlField, GameState, MemoryVariable } from "../../../domain/types.js";
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
  const profile = getEffectiveControlProfile(state);
  const derived = getLambdaDerivedValues(state.lambdaControl, profile);
  const alphaEntry = state.ui.memoryVariable === "\u03B1" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\alpha`;
  const betaEntry = state.ui.memoryVariable === "\u03B2" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\beta`;
  const gammaEntry = state.ui.memoryVariable === "\u03B3" ? selectedVectorEntry(state.ui.memoryVariable) : String.raw`\gamma`;
  const matrixRows = CONTROL_FIELDS.map((target) => {
    const eq = profile.equations[target];
    return CONTROL_FIELDS.map((source) => formatMatrixNumber(eq.coefficients[source])).join("&");
  }).join(String.raw`\\`);
  const inputVector = [
    formatMatrixNumber(derived.effectiveFields.alpha),
    formatMatrixNumber(derived.effectiveFields.beta),
    formatMatrixNumber(derived.effectiveFields.gamma),
    formatMatrixNumber(derived.effectiveFields.delta),
    formatMatrixNumber(derived.effectiveFields.epsilon),
  ].join(String.raw`\\`);
  const outputVector = [
    String.raw`\alpha'=${derived.effectiveFields.alpha.toString()}`,
    String.raw`\beta'=${derived.effectiveFields.beta.toString()}`,
    String.raw`\gamma'=${derived.effectiveFields.gamma.toString()}`,
    String.raw`\delta'=${derived.effectiveFields.delta.toString()}`,
    String.raw`\epsilon'=${derived.effectiveFields.epsilon.toString()}`,
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
  const derived = getLambdaDerivedValues(state.lambdaControl, getEffectiveControlProfile(state));
  const epsilon = toDisplayString(derived.epsilonEffective);
  return [
    `alpha=${derived.effectiveFields.alpha.toString()}`,
    `beta=${derived.effectiveFields.beta.toString()}`,
    `gamma=${derived.effectiveFields.gamma.toString()}`,
    `delta=${derived.deltaEffective.toString()}`,
    `epsilon=${epsilon}`,
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
