import type { ControlField, GameState } from "./types.js";

const CONTROL_SELECTION_ORDER: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];

export const getSettableControlFields = (): ControlField[] => [...CONTROL_SELECTION_ORDER];

export const normalizeSelectedControlField = (
  selectedControlField: ControlField | null | undefined,
): ControlField | null => {
  if (selectedControlField && CONTROL_SELECTION_ORDER.includes(selectedControlField)) {
    return selectedControlField;
  }
  return CONTROL_SELECTION_ORDER[0] ?? null;
};

export type SelectedControlContext = {
  selectedControlField: ControlField | null;
  settableFields: ControlField[];
};

export const resolveSelectedControlFieldFromUi = (
  ui: Pick<GameState["ui"], "selectedControlField">,
): ControlField | null => normalizeSelectedControlField(ui.selectedControlField);

export const resolveSelectedControlContextFromUi = (
  ui: Pick<GameState["ui"], "selectedControlField">,
): SelectedControlContext => {
  const settableFields = getSettableControlFields();
  const selectedControlField = normalizeSelectedControlField(ui.selectedControlField);
  return {
    selectedControlField,
    settableFields,
  };
};

export const getNormalizedSelectedControlField = (
  state: GameState,
): { selectedControlField: ControlField | null; settableFields: ControlField[] } => {
  const context = resolveSelectedControlContextFromUi(state.ui);
  return {
    selectedControlField: context.selectedControlField,
    settableFields: context.settableFields,
  };
};
