import { getAppServices } from "../../contracts/appServices.js";
import { projectEligibleUnlockHintProgressRows, type UnlockHintProgressRow } from "../../domain/unlockHintProgress.js";
import type { GameState, UnlockEffect } from "../../domain/types.js";
import type { UxRole, UxRoleAssignment, UxRoleState } from "./uxRoles.js";
import type { StateViewModelProjection } from "./viewModelProjection.js";

type ClosestHintCategory = "operator" | "non_operator" | "lambda_point" | "calculator";

export type TotalHintRowViewModel = {
  category: ClosestHintCategory;
  label: string;
  value: string;
  uxRole: UxRole;
  uxState: UxRoleState;
  uxRoleOverride?: UxRole;
  overrideReason?: string;
};

const isOperatorUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_slot_operator";

const isNonOperatorKeyUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_digit"
  || effect.type === "unlock_execution"
  || effect.type === "unlock_visualizer"
  || effect.type === "unlock_utility"
  || effect.type === "unlock_memory"
  || effect.type === "unlock_installed_only";

const isLambdaPointUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "increase_allocator_max_points"
  || effect.type === "increase_allocator_max_points_for_calculator";

const isCalculatorUnlockEffect = (effect: UnlockEffect): boolean =>
  effect.type === "unlock_calculator";

const getRowScore = (row: UnlockHintProgressRow): number =>
  row.progress.mode === "partial"
    ? row.progress.progress01
    : row.progress.state === "observed"
      ? 1
      : 0;

const toProgressFraction = (row: UnlockHintProgressRow): string => {
  if (row.progress.mode === "partial") {
    const current = Math.max(0, Math.floor(row.progress.current));
    const target = Math.max(1, Math.floor(row.progress.target));
    return `${current.toString()}/${target.toString()}`;
  }
  return row.progress.state === "observed" ? "1/1" : "0/1";
};

const resolveHintRole = (category: ClosestHintCategory): { uxRole: UxRole; uxState: UxRoleState } => {
  if (category === "lambda_point") {
    return { uxRole: "imaginary", uxState: "active" };
  }
  return { uxRole: "unlock", uxState: "normal" };
};

export const resolveTotalHintRowUxAssignment = (row: TotalHintRowViewModel): UxRoleAssignment => ({
  uxRole: row.uxRole,
  uxState: row.uxState,
  ...(row.uxRoleOverride ? { uxRoleOverride: row.uxRoleOverride } : {}),
  ...(row.overrideReason ? { overrideReason: row.overrideReason } : {}),
});

export const buildTotalHintRowsViewModel: StateViewModelProjection<TotalHintRowViewModel[]> = (state) => {
  const eligibleRows = projectEligibleUnlockHintProgressRows(state);
  const catalog = getAppServices().contentProvider.unlockCatalog;
  const unlockById = new Map(catalog.map((unlock) => [unlock.id, unlock]));

  const chooseForCategory = (category: ClosestHintCategory): UnlockHintProgressRow | null => {
    const filtered = eligibleRows.filter((row) => {
      const unlock = unlockById.get(row.unlockId);
      if (!unlock) {
        return false;
      }
      if (category === "operator") {
        return isOperatorUnlockEffect(unlock.effect);
      }
      if (category === "non_operator") {
        return isNonOperatorKeyUnlockEffect(unlock.effect);
      }
      if (category === "calculator") {
        return isCalculatorUnlockEffect(unlock.effect);
      }
      return isLambdaPointUnlockEffect(unlock.effect);
    });
    if (filtered.length === 0) {
      return null;
    }
    filtered.sort((left, right) => {
      const delta = getRowScore(right) - getRowScore(left);
      if (Math.abs(delta) > Number.EPSILON) {
        return delta > 0 ? 1 : -1;
      }
      const leftType = left.predicateType;
      const rightType = right.predicateType;
      if (leftType < rightType) {
        return -1;
      }
      if (leftType > rightType) {
        return 1;
      }
      return left.unlockId.localeCompare(right.unlockId);
    });
    return filtered[0] ?? null;
  };

  const categories: Array<{ key: ClosestHintCategory; label: string }> = [
    { key: "operator", label: "OP" },
    { key: "non_operator", label: "KEY" },
    { key: "calculator", label: "CALC" },
    { key: "lambda_point", label: "IMAG" },
  ];

  return categories.map((category) => {
    const ux = resolveHintRole(category.key);
    const match = chooseForCategory(category.key);
    if (!match) {
      return {
        category: category.key,
        label: category.label,
        value: "n/a",
        uxRole: ux.uxRole,
        uxState: "muted",
      };
    }
    return {
      category: category.key,
      label: category.label,
      value: `${toProgressFraction(match)} ${match.predicateType}`,
      uxRole: ux.uxRole,
      uxState: ux.uxState,
    };
  });
};
