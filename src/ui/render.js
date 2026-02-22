import { UNLOCK_COST_DIGIT_2 } from "../game/state.js";

function setButtonState(button, enabled) {
  button.disabled = !enabled;
  button.classList.toggle("locked", !enabled);
}

export function render(state, nodes) {
  nodes.display.textContent = state.calculator.display;
  nodes.totalEarned.textContent = state.totalEarned.toString();

  setButtonState(nodes.key2, state.unlocked.digit2);

  if (state.unlocked.digit2) {
    nodes.buy2.disabled = true;
    nodes.buy2.textContent = "2 unlocked";
  } else {
    const canAfford = state.totalEarned >= UNLOCK_COST_DIGIT_2;
    nodes.buy2.disabled = !canAfford;
    nodes.buy2.textContent = `Unlock 2 (cost: ${UNLOCK_COST_DIGIT_2.toString()})`;
  }
}
