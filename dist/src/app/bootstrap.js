import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";
const root = document.querySelector("#app");
if (!root) {
    throw new Error("#app root not found.");
}
const debugToggle = document.querySelector("[data-debug-toggle]");
const debugMenu = document.querySelector("[data-debug-menu]");
const clearSaveButton = document.querySelector("[data-debug-clear-save]");
if (!debugToggle || !debugMenu || !clearSaveButton) {
    throw new Error("Debug controls are missing.");
}
const storageRepo = createLocalStorageRepo(window.localStorage);
const loaded = storageRepo.load();
const store = createStore(loaded ?? initialState());
const redraw = () => {
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
//# sourceMappingURL=bootstrap.js.map