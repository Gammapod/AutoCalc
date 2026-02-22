export function bindEvents(root, dispatch) {
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const key = target.dataset.key;
    if (key) {
      dispatch({ type: "PRESS_KEY", key });
      return;
    }

    if (target.id === "buy-2") {
      dispatch({ type: "BUY_UNLOCK_2" });
      return;
    }

    if (target.id === "debug-unlock-2") {
      dispatch({ type: "DEBUG_UNLOCK_2" });
      return;
    }

    if (target.id === "reset-save") {
      dispatch({ type: "RESET_SAVE" });
    }
  });
}
