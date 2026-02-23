import { reducer } from "../domain/reducer.js";
export const createStore = (initialState) => {
    let state = initialState;
    const subscribers = new Set();
    return {
        getState: () => state,
        dispatch: (action) => {
            state = reducer(state, action);
            for (const subscriber of subscribers) {
                subscriber(state);
            }
            return action;
        },
        subscribe: (subscriber) => {
            subscribers.add(subscriber);
            return () => subscribers.delete(subscriber);
        },
    };
};
//# sourceMappingURL=store.js.map