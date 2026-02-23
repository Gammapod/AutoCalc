const keyOrder = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "+", "=", "C", "CE"];
const isKeyUnlocked = (state, key) => {
    if (/^\d$/.test(key)) {
        return state.unlocks.digits[key];
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
export const render = (root, state, dispatch) => {
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
    rollEl.textContent = state.calculator.roll.length
        ? state.calculator.roll.map((value) => value.toString()).join(", ")
        : "(empty)";
    unlockEl.textContent = `CE unlocked: ${state.unlocks.utilities.CE ? "yes" : "no"}`;
    keysEl.innerHTML = "";
    for (const key of keyOrder) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = key;
        button.disabled = !isKeyUnlocked(state, key);
        button.addEventListener("click", () => {
            dispatch({ type: "PRESS_KEY", key });
        });
        keysEl.appendChild(button);
    }
};
//# sourceMappingURL=render.js.map