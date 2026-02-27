import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";

const root = document.querySelector("#app");
if (!root) {
  throw new Error("#app root not found.");
}

const debugToggle = document.querySelector<HTMLInputElement>("[data-debug-toggle]");
const debugMenu = document.querySelector<HTMLElement>("[data-debug-menu]");
const clearSaveButton = document.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
if (!debugToggle || !debugMenu || !clearSaveButton) {
  throw new Error("Debug controls are missing.");
}

const storageRepo = createLocalStorageRepo(window.localStorage);
const loaded = storageRepo.load();
const store = createStore(loaded ?? initialState());

const redraw = (): void => {
  render(root, store.getState(), store.dispatch);
};

redraw();
store.subscribe((state) => {
  render(root, state, store.dispatch);
  storageRepo.save(state);
});

debugToggle.addEventListener("change", () => {
  debugMenu.hidden = !debugToggle.checked;
});

clearSaveButton.addEventListener("click", () => {
  store.dispatch({ type: "RESET_RUN" });
  storageRepo.clear();
});
