import type { GameState, UnlockEffect, UnlockPredicate, UnlockDefinition } from "./types.js";

export const evaluatePredicate = (predicate: UnlockPredicate, state: GameState): boolean => {
  if (predicate.type === "roll_length_at_least") {
    return state.calculator.roll.length >= predicate.length;
  }
  if (predicate.type === "total_equals") {
    return state.calculator.total === predicate.value;
  }
  if (predicate.type === "total_at_least") {
    return state.calculator.total >= predicate.value;
  }
  if (predicate.type === "roll_ends_with_sequence") {
    const { sequence } = predicate;
    if (sequence.length === 0 || state.calculator.roll.length < sequence.length) {
      return false;
    }
    const rollSuffix = state.calculator.roll.slice(-sequence.length);
    return rollSuffix.every((value, index) => value === sequence[index]);
  }
  if (predicate.type === "operation_equals") {
    const slots = [...state.calculator.operationSlots];
    if (predicate.includeDrafting ?? true) {
      const { draftingSlot } = state.calculator;
      if (draftingSlot && draftingSlot.operandInput !== "") {
        slots.push({
          operator: draftingSlot.operator,
          operand: BigInt(draftingSlot.operandInput),
        });
      }
    }
    return (
      slots.length === predicate.slots.length &&
      slots.every(
        (slot, index) =>
          slot.operator === predicate.slots[index].operator && slot.operand === predicate.slots[index].operand,
      )
    );
  }
  return false;
};

export const applyEffect = (effect: UnlockEffect, state: GameState): GameState => {
  if (effect.type === "unlock_utility") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        utilities: {
          ...state.unlocks.utilities,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "increase_max_total_digits") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        maxTotalDigits: state.unlocks.maxTotalDigits + effect.amount,
      },
    };
  }
  if (effect.type === "unlock_slot_operator") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        slotOperators: {
          ...state.unlocks.slotOperators,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_execution") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        execution: {
          ...state.unlocks.execution,
          [effect.key]: true,
        },
      },
    };
  }
  if (effect.type === "unlock_digit") {
    return {
      ...state,
      unlocks: {
        ...state.unlocks,
        digits: {
          ...state.unlocks.digits,
          [effect.key]: true,
        },
      },
    };
  }
  return state;
};

export const applyUnlocks = (state: GameState, catalog: UnlockDefinition[]): GameState => {
  let nextState = state;

  for (const unlock of catalog) {
    const isAlreadyCompleted = nextState.completedUnlockIds.includes(unlock.id);

    if (unlock.once && isAlreadyCompleted) {
      continue;
    }

    if (!evaluatePredicate(unlock.predicate, nextState)) {
      continue;
    }

    nextState = applyEffect(unlock.effect, nextState);
    if (!isAlreadyCompleted) {
      nextState = {
        ...nextState,
        completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
      };
    }
  }

  return nextState;
};
