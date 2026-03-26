import { toIndexFromCoord } from "./keypadLayoutModel.js";
import { KEY_ID } from "./keyPresentation.js";
import type { CalculatorId, Key, LayoutCell } from "./types.js";

type SeedPlacement = {
  row: number;
  col: number;
  key: Key;
  behavior?: Extract<LayoutCell, { kind: "key" }>["behavior"];
};

export type CalculatorSeedSpec = {
  calculatorId: CalculatorId;
  keypadColumns: number;
  keypadRows: number;
  activeVisualizer: "total" | "title";
  placements: readonly SeedPlacement[];
};

const fPlacements: readonly SeedPlacement[] = [
  { row: 3, col: 2, key: KEY_ID.system_save_quit_main_menu },
  { row: 1, col: 2, key: KEY_ID.unary_inc },
  { row: 1, col: 1, key: KEY_ID.exec_equals },
];

const gPlacements: readonly SeedPlacement[] = [
  { row: 2, col: 2, key: KEY_ID.toggle_binary_mode, behavior: { type: "toggle_flag", flag: "settings.binary_mode" } },
  { row: 2, col: 1, key: KEY_ID.exec_step_through },
  { row: 1, col: 1, key: KEY_ID.unary_not },
];

const menuPlacements: readonly SeedPlacement[] = [
  { row: 6, col: 1, key: KEY_ID.viz_title },
  { row: 5, col: 1, key: KEY_ID.viz_release_notes },
  { row: 4, col: 1, key: KEY_ID.system_mode_game },
  { row: 3, col: 1, key: KEY_ID.system_new_game },
  { row: 2, col: 1, key: KEY_ID.system_mode_sandbox },
  { row: 1, col: 1, key: KEY_ID.system_quit_game },
];

export const calculatorSeedManifest: Readonly<Record<CalculatorId, CalculatorSeedSpec>> = {
  f: {
    calculatorId: "f",
    keypadColumns: 2,
    keypadRows: 3,
    activeVisualizer: "total",
    placements: fPlacements,
  },
  g: {
    calculatorId: "g",
    keypadColumns: 4,
    keypadRows: 2,
    activeVisualizer: "total",
    placements: gPlacements,
  },
  menu: {
    calculatorId: "menu",
    keypadColumns: 1,
    keypadRows: 6,
    activeVisualizer: "title",
    placements: menuPlacements,
  },
};

export const applyCalculatorSeedPlacements = (
  calculatorId: CalculatorId,
  layout: LayoutCell[],
  columns: number,
  rows: number,
): LayoutCell[] => {
  const seeded = layout.map((cell) => ({ ...cell }));
  for (const placement of calculatorSeedManifest[calculatorId].placements) {
    const index = toIndexFromCoord({ row: placement.row, col: placement.col }, columns, rows);
    if (index < 0 || index >= seeded.length) {
      continue;
    }
    seeded[index] = placement.behavior
      ? { kind: "key", key: placement.key, behavior: placement.behavior }
      : { kind: "key", key: placement.key };
  }
  return seeded;
};

export const createSeededKeyLayout = (
  calculatorId: CalculatorId,
  override?: { columns?: number; rows?: number },
): { keyLayout: LayoutCell[]; columns: number; rows: number; activeVisualizer: "total" | "title" } => {
  const seed = calculatorSeedManifest[calculatorId];
  const columns = override?.columns ?? seed.keypadColumns;
  const rows = override?.rows ?? seed.keypadRows;
  const layout: LayoutCell[] = Array.from(
    { length: Math.max(1, columns * rows) },
    () => ({ kind: "placeholder", area: "empty" as const }),
  );
  return {
    keyLayout: applyCalculatorSeedPlacements(calculatorId, layout, columns, rows),
    columns,
    rows,
    activeVisualizer: seed.activeVisualizer,
  };
};
