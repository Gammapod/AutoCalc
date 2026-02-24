import type { Action, GameState, Key } from "../domain/types.js";

const isKeyUnlocked = (state: GameState, key: Key): boolean => {
  if (/^\d$/.test(key)) {
    return state.unlocks.digits[key as keyof GameState["unlocks"]["digits"]];
  }
  if (key === "+") {
    return state.unlocks.slotOperators["+"];
  }
  if (key === "C" || key === "CE") {
    return state.unlocks.utilities[key];
  }
  if (key === "=") {
    return true;
  }
  return false;
};

export const render = (root: Element, state: GameState, dispatch: (action: Action) => unknown): void => {
  const totalEl = root.querySelector("[data-total]");
  const slotEl = root.querySelector("[data-slot]");
  const rollEl = root.querySelector("[data-roll]");
  const unlockEl = root.querySelector("[data-unlocks]");
  const keysEl = root.querySelector("[data-keys]");

  if (!totalEl || !slotEl || !rollEl || !unlockEl || !keysEl) {
    throw new Error("UI mount points are missing.");
  }

  totalEl.textContent = state.calculator.total.toString();

  const committed = state.calculator.operationSlots.map((slot) => `[ ${slot.operator} ${slot.operand.toString()} ]`);
  const draft = state.calculator.draftingSlot
    ? `[ ${state.calculator.draftingSlot.operator} ${state.calculator.draftingSlot.operandInput || "_"} ]`
    : null;
  slotEl.textContent = [...committed, draft].filter(Boolean).join(" -> ") || "(no operation slots)";

  rollEl.innerHTML = "";
  if (state.calculator.roll.length) {
    const recentFirst = [...state.calculator.roll].reverse();
    for (const value of recentFirst) {
      const line = document.createElement("div");
      line.className = "roll-line";
      line.textContent = value.toString();
      rollEl.appendChild(line);
    }
  } else {
    const line = document.createElement("div");
    line.className = "roll-line";
    line.textContent = "(empty)";
    rollEl.appendChild(line);
  }

  unlockEl.textContent = `CE unlocked: ${state.unlocks.utilities.CE ? "yes" : "no"}`;

  keysEl.innerHTML = "";
  for (const cell of state.ui.keyLayout) {
    if (cell.kind === "placeholder") {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      keysEl.appendChild(placeholder);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    if (cell.wide) {
      button.classList.add("key--wide");
    }
    if (cell.tall) {
      button.classList.add("key--tall");
    }
    button.textContent = cell.key;
    button.disabled = !isKeyUnlocked(state, cell.key);
    button.addEventListener("click", () => {
      dispatch({ type: "PRESS_KEY", key: cell.key });
    });
    keysEl.appendChild(button);
  }
};
