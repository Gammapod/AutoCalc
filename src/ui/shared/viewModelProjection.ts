import type { GameState } from "../../domain/types.js";

export type ViewModelProjection<TInput, TViewModel> = (input: TInput) => TViewModel;

export type StateViewModelProjection<TViewModel> = ViewModelProjection<GameState, TViewModel>;
