import { initialState } from "../../src/domain/state.js";
import type { Action } from "../../src/domain/types.js";
import type { DomainEvent } from "../../src_v2/domain/events.js";
import { actionFromEvent, eventFromAction } from "../../src_v2/domain/events.js";

export const buildActionFixtures = (): Action[] => {
  const state = initialState();
  return [
    { type: "PRESS_KEY", key: "1" },
    { type: "RESET_RUN" },
    { type: "HYDRATE_SAVE", state },
    { type: "UNLOCK_ALL" },
    { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 1 },
    { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 },
    { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 0 },
    { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 3 },
    { type: "UPGRADE_KEYPAD_ROW" },
    { type: "UPGRADE_KEYPAD_COLUMN" },
    { type: "TOGGLE_FLAG", flag: "sticky.negate" },
    { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
    { type: "ALLOCATOR_SET_MAX_POINTS", value: 12 },
    { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 2 },
    { type: "RESET_ALLOCATOR_DEVICE" },
    { type: "ALLOCATOR_RETURN_PRESSED" },
    { type: "ALLOCATOR_ALLOCATE_PRESSED" },
  ];
};

export const buildDomainEventFixtures = (): DomainEvent[] => buildActionFixtures().map((action) => eventFromAction(action));

export const roundTripAction = (action: Action): Action => actionFromEvent(eventFromAction(action));

export const roundTripEvent = (event: DomainEvent): DomainEvent => eventFromAction(actionFromEvent(event));
