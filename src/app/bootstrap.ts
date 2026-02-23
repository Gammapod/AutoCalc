import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";

const root = document.querySelector("#app");
if (!root) {
  throw new Error("#app root not found.");
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
