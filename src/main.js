import { reduce } from "./game/reducer.js";
import { AUTOSAVE_INTERVAL_MS } from "./game/state.js";
import { clearSave, loadState, saveState } from "./game/save.js";
import { bindEvents } from "./ui/events.js";
import { render } from "./ui/render.js";

const nodes = {
  display: document.getElementById("display"),
  totalEarned: document.getElementById("total-earned"),
  key2: document.getElementById("key-2"),
  buy2: document.getElementById("buy-2")
};

let state = loadState();
let isDirty = false;

function doSave() {
  saveState(state);
  isDirty = false;
}

function dispatch(action) {
  if (action.type === "RESET_SAVE") {
    clearSave();
    state = reduce(state, { type: "RESET_STATE" });
    doSave();
    render(state, nodes);
    return;
  }

  const nextState = reduce(state, action);
  if (nextState !== state) {
    state = nextState;
    isDirty = true;
    render(state, nodes);
  }

  if (
    action.type === "BUY_UNLOCK_2" ||
    action.type === "DEBUG_UNLOCK_2" ||
    (action.type === "PRESS_KEY" && (action.key === "=" || action.key === "C"))
  ) {
    doSave();
  }
}

bindEvents(document, dispatch);
render(state, nodes);

setInterval(() => {
  if (isDirty) {
    doSave();
  }
}, AUTOSAVE_INTERVAL_MS);
