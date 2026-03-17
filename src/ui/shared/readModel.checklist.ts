import { analyzeUnlockSpecRows, type UnlockSpecStatus } from "../../domain/analysis.js";
import { buildUnlockCriteria } from "../../domain/unlockEngine.js";
import type {
  GameState,
  UnlockDefinition,
  UnlockEffect,
} from "../../domain/types.js";
import { getContentProvider } from "../../contracts/contentRegistry.js";
import { formatKeyLabel, formatOperatorForDisplay } from "./readModel.keyLabels.js";

export type UnlockRowState = "not_completed" | "completed" | "impossible";

export type UnlockCriterionVm = {
  label: string;
  checked: boolean;
};

export type UnlockRowVm = {
  id: string;
  name: string;
  state: UnlockRowState;
  criteria: UnlockCriterionVm[];
  difficulty?: "difficult";
  difficultyLabel?: "Difficult";
};

export type ChecklistVisibilityPolicy = {
  showCompletedAlways: boolean;
  showUnknown: boolean;
  showTodo: boolean;
  hideBlocked: boolean;
};

export type ChecklistVisibleRowVm = UnlockRowVm & {
  analysisStatus?: UnlockSpecStatus;
  visibilityReason?: string;
};

export type BuildVisibleChecklistRowsOptions = {
  catalog?: UnlockDefinition[];
  visibilityPolicy?: Partial<ChecklistVisibilityPolicy>;
  includeDebugMeta?: boolean;
};

const getUnlockName = (effect: UnlockEffect): string => {
  if (effect.type === "unlock_digit") {
    return effect.key;
  }
  if (effect.type === "unlock_slot_operator") {
    return formatOperatorForDisplay(effect.key);
  }
  if (effect.type === "unlock_execution") {
    return effect.key;
  }
  if (effect.type === "unlock_visualizer") {
    return effect.key;
  }
  if (effect.type === "unlock_utility") {
    return effect.key;
  }
  if (effect.type === "unlock_memory") {
    return effect.key;
  }
  if (effect.type === "increase_max_total_digits") {
    return "maxTotalDigits";
  }
  if (effect.type === "increase_allocator_max_points") {
    return "\u03BB++";
  }
  if (effect.type === "upgrade_keypad_column") {
    return "keypadCols";
  }
  if (effect.type === "upgrade_keypad_row") {
    return "keypadRows";
  }
  if (effect.type === "move_key_to_coord") {
    return `${formatKeyLabel(effect.key)}->R${effect.row.toString()}C${effect.col.toString()}`;
  }
  return "unknown";
};

const isUnlockImpossible = (_unlock: UnlockDefinition, _state: GameState): boolean => false;

const DEFAULT_CHECKLIST_VISIBILITY_POLICY: ChecklistVisibilityPolicy = {
  showCompletedAlways: true,
  showUnknown: true,
  showTodo: true,
  hideBlocked: true,
};

type BaseChecklistRowVm = {
  row: UnlockRowVm;
  completed: boolean;
  difficulty: "normal" | "difficult";
};

const buildBaseChecklistRows = (
  state: GameState,
  catalog: UnlockDefinition[],
): BaseChecklistRowVm[] =>
  catalog.map((unlock) => {
    const completed = state.completedUnlockIds.includes(unlock.id);
    const criteria = buildUnlockCriteria(unlock.predicate, state);
    return {
      completed,
      row: {
        id: unlock.id,
        name: getUnlockName(unlock.effect),
        state: completed ? "completed" : "not_completed",
        criteria: completed ? criteria.map((criterion) => ({ ...criterion, checked: true })) : criteria,
        difficulty: unlock.difficulty === "difficult" ? "difficult" : undefined,
        difficultyLabel: unlock.difficulty === "difficult" ? "Difficult" : undefined,
      },
      difficulty: unlock.difficulty ?? "normal",
    };
  });

const getChecklistVisibilityDecision = (
  status: UnlockSpecStatus | null,
  completed: boolean,
  policy: ChecklistVisibilityPolicy,
): { visible: boolean; reason: string } => {
  if (completed && policy.showCompletedAlways) {
    return { visible: true, reason: "completed_row_always_visible" };
  }
  if (status === "satisfied" || status === "possible") {
    return { visible: true, reason: "status_attemptable" };
  }
  if (status === "unknown" && policy.showUnknown) {
    return { visible: true, reason: "status_unknown_visible_by_policy" };
  }
  if (status === "todo" && policy.showTodo) {
    return { visible: true, reason: "status_todo_visible_by_policy" };
  }
  if (status === "blocked" && policy.hideBlocked) {
    return { visible: false, reason: "status_blocked_hidden_by_policy" };
  }
  if (status === null) {
    return { visible: true, reason: "missing_analysis_row_fails_open" };
  }
  return { visible: true, reason: "default_visible_fallback" };
};

export const buildVisibleChecklistRows = (
  state: GameState,
  options: BuildVisibleChecklistRowsOptions = {},
): ChecklistVisibleRowVm[] => {
  const catalog = options.catalog ?? getContentProvider().unlockCatalog;
  const visibilityPolicy: ChecklistVisibilityPolicy = {
    ...DEFAULT_CHECKLIST_VISIBILITY_POLICY,
    ...(options.visibilityPolicy ?? {}),
  };
  const includeDebugMeta = options.includeDebugMeta ?? false;

  const keypadScopeRowsById = new Map(
    analyzeUnlockSpecRows(state, { capabilityScope: "present_on_keypad" }, catalog).map((row) => [row.unlockId, row]),
  );
  const unlockedScopeRowsById = new Map(
    analyzeUnlockSpecRows(state, { capabilityScope: "all_unlocked" }, catalog).map((row) => [row.unlockId, row]),
  );
  const baseRows = buildBaseChecklistRows(state, catalog);

  const visibleRows: ChecklistVisibleRowVm[] = [];
  for (const base of baseRows) {
    const specRow =
      base.difficulty === "difficult"
        ? unlockedScopeRowsById.get(base.row.id)
        : keypadScopeRowsById.get(base.row.id);
    const status = specRow?.status ?? null;
    const decision = getChecklistVisibilityDecision(status, base.completed, visibilityPolicy);
    if (!decision.visible) {
      continue;
    }
    if (includeDebugMeta) {
      visibleRows.push({
        ...base.row,
        analysisStatus: status ?? undefined,
        visibilityReason: decision.reason,
      });
    } else {
      visibleRows.push(base.row);
    }
  }

  const pending = visibleRows.filter((row) => row.state === "not_completed");
  const completed = visibleRows.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};

export const buildUnlockRows = (
  state: GameState,
  catalog: UnlockDefinition[] = getContentProvider().unlockCatalog,
  impossibleCheck: (unlock: UnlockDefinition, state: GameState) => boolean = isUnlockImpossible,
): UnlockRowVm[] => {
  const visibleRowsById = new Map(buildVisibleChecklistRows(state, { catalog }).map((row) => [row.id, row]));
  const rows: UnlockRowVm[] = [];
  for (const unlock of catalog) {
    const impossible = impossibleCheck(unlock, state);
    const visibleRow = visibleRowsById.get(unlock.id);
    if (impossible || !visibleRow) {
      rows.push({
        id: unlock.id,
        name: getUnlockName(unlock.effect),
        state: "impossible",
        criteria: [],
      });
      continue;
    }
    rows.push(visibleRow);
  }
  const visible = rows.filter((row) => row.state !== "impossible");
  const pending = visible.filter((row) => row.state === "not_completed");
  const completed = visible.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};
