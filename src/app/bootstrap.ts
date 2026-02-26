import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";
import { createTechTreeRuntime, resolveUnlockedNodes, type TechTreeRuntime } from "./techTree.js";
import type { GameState } from "../domain/types.js";

const root = document.querySelector("#app");
if (!root) {
  throw new Error("#app root not found.");
}

const debugToggle = document.querySelector<HTMLInputElement>("[data-debug-toggle]");
const debugMenu = document.querySelector<HTMLElement>("[data-debug-menu]");
const clearSaveButton = document.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
const techTreeList = document.querySelector<HTMLElement>("[data-debug-tech-list]");
if (!debugToggle || !debugMenu || !clearSaveButton || !techTreeList) {
  throw new Error("Debug controls are missing.");
}

const storageRepo = createLocalStorageRepo(window.localStorage);
const loaded = storageRepo.load();
const store = createStore(loaded ?? initialState());

const redraw = (): void => {
  render(root, store.getState(), store.dispatch);
};

const collectSeedNodeIds = (state: GameState): string[] => {
  const seeds: string[] = [];
  if (state.unlocks.digits["1"]) {
    seeds.push("P2");
  }
  if (state.unlocks.slotOperators["+"]) {
    seeds.push("Oplus");
  }
  if (state.unlocks.execution["="]) {
    seeds.push("P1");
  }
  return seeds;
};

const renderTechTree = (runtime: TechTreeRuntime, state: GameState): void => {
  const unlockedNodeIds = resolveUnlockedNodes(runtime.nodes, collectSeedNodeIds(state));
  techTreeList.innerHTML = "";

  const header = document.createElement("div");
  header.className = "debug-tech-summary";
  header.textContent = `Unlocked: ${unlockedNodeIds.size}/${runtime.nodes.length}`;
  techTreeList.appendChild(header);

  for (const node of runtime.nodes) {
    const row = document.createElement("div");
    row.className = "debug-tech-row";

    const status = document.createElement("span");
    status.className = "debug-tech-status";
    status.textContent = unlockedNodeIds.has(node.id) ? "Unlocked" : "Locked";
    row.appendChild(status);

    const label = document.createElement("span");
    label.className = "debug-tech-label";
    label.textContent = `${node.id} - ${node.label}`;
    row.appendChild(label);

    techTreeList.appendChild(row);
  }
};

redraw();
let techTreeRuntime: TechTreeRuntime | null = null;
store.subscribe((state) => {
  render(root, state, store.dispatch);
  storageRepo.save(state);
  if (techTreeRuntime) {
    renderTechTree(techTreeRuntime, state);
  }
});

debugToggle.addEventListener("change", () => {
  debugMenu.hidden = !debugToggle.checked;
});

clearSaveButton.addEventListener("click", () => {
  store.dispatch({ type: "RESET_RUN" });
  storageRepo.clear();
});

const initTechTree = async (): Promise<void> => {
  try {
    const response = await fetch("./design_refs/dependency_map.mmd");
    if (!response.ok) {
      throw new Error(`Failed to load dependency map (${response.status})`);
    }
    const source = await response.text();
    techTreeRuntime = createTechTreeRuntime(source);
    renderTechTree(techTreeRuntime, store.getState());
  } catch (error) {
    techTreeList.innerHTML = "";
    const failure = document.createElement("div");
    failure.className = "debug-tech-error";
    failure.textContent = error instanceof Error ? error.message : "Failed to load dependency map.";
    techTreeList.appendChild(failure);
  }
};

void initTechTree();
