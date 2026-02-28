import type { KeypadCellRecord, KeypadCoord, LayoutCell, SlotId } from "./types.js";

const EMPTY_CELL: LayoutCell = { kind: "placeholder", area: "empty" };

const normalizeDimension = (value: number): number => Math.max(1, Math.trunc(value) || 1);

export const generateSlotId = (row: number, col: number): SlotId => `kp:r${row}:c${col}`;

const toCoordKey = (row: number, col: number): string => `${row}:${col}`;

const cloneCell = (cell: LayoutCell): LayoutCell => {
  if (cell.kind === "placeholder") {
    return { kind: "placeholder", area: cell.area };
  }
  return cell.behavior ? { kind: "key", key: cell.key, behavior: cell.behavior } : { kind: "key", key: cell.key };
};

const emptyCell = (): LayoutCell => cloneCell(EMPTY_CELL);

export const toCoordFromIndex = (index: number, columns: number, rows: number): KeypadCoord => {
  const normalizedColumns = normalizeDimension(columns);
  const normalizedRows = normalizeDimension(rows);
  const visualRow = Math.floor(index / normalizedColumns);
  const visualCol = index % normalizedColumns;
  return {
    row: normalizedRows - visualRow,
    col: normalizedColumns - visualCol,
  };
};

export const toIndexFromCoord = (coord: KeypadCoord, columns: number, rows: number): number => {
  const normalizedColumns = normalizeDimension(columns);
  const normalizedRows = normalizeDimension(rows);
  const visualRow = normalizedRows - coord.row;
  const visualCol = normalizedColumns - coord.col;
  return visualRow * normalizedColumns + visualCol;
};

export const fromKeyLayoutArray = (layout: LayoutCell[], columns: number, rows: number): KeypadCellRecord[] => {
  const normalizedColumns = normalizeDimension(columns);
  const normalizedRows = normalizeDimension(rows);
  const slotCount = normalizedColumns * normalizedRows;
  const records: KeypadCellRecord[] = [];
  for (let index = 0; index < slotCount; index += 1) {
    const coord = toCoordFromIndex(index, normalizedColumns, normalizedRows);
    const cell = layout[index] ? cloneCell(layout[index]) : emptyCell();
    records.push({
      id: generateSlotId(coord.row, coord.col),
      row: coord.row,
      col: coord.col,
      cell,
    });
  }
  return records;
};

const toCellByCoord = (records: KeypadCellRecord[]): Map<string, LayoutCell> => {
  const byCoord = new Map<string, LayoutCell>();
  for (const record of records) {
    byCoord.set(toCoordKey(record.row, record.col), cloneCell(record.cell));
  }
  return byCoord;
};

export const toKeyLayoutArray = (records: KeypadCellRecord[], columns: number, rows: number): LayoutCell[] => {
  const normalizedColumns = normalizeDimension(columns);
  const normalizedRows = normalizeDimension(rows);
  const slotCount = normalizedColumns * normalizedRows;
  const byCoord = toCellByCoord(records);
  const layout: LayoutCell[] = [];
  for (let index = 0; index < slotCount; index += 1) {
    const coord = toCoordFromIndex(index, normalizedColumns, normalizedRows);
    layout.push(cloneCell(byCoord.get(toCoordKey(coord.row, coord.col)) ?? emptyCell()));
  }
  return layout;
};

export const resizeAnchored = (
  records: KeypadCellRecord[],
  toColumns: number,
  toRows: number,
): KeypadCellRecord[] => {
  const normalizedColumns = normalizeDimension(toColumns);
  const normalizedRows = normalizeDimension(toRows);
  const byCoord = toCellByCoord(records);
  const next: KeypadCellRecord[] = [];

  for (let row = 1; row <= normalizedRows; row += 1) {
    for (let col = 1; col <= normalizedColumns; col += 1) {
      const cell = byCoord.get(toCoordKey(row, col)) ?? emptyCell();
      next.push({
        id: generateSlotId(row, col),
        row,
        col,
        cell,
      });
    }
  }

  return next;
};

export const upgradeRowsAnchored = (records: KeypadCellRecord[], columns: number, rows: number): KeypadCellRecord[] =>
  resizeAnchored(records, columns, rows + 1);

export const upgradeColumnsAnchored = (
  records: KeypadCellRecord[],
  columns: number,
  rows: number,
): KeypadCellRecord[] => resizeAnchored(records, columns + 1, rows);

export const getCellAtIndex = (
  records: KeypadCellRecord[],
  index: number,
  columns: number,
  rows: number,
): LayoutCell | null => {
  const coord = toCoordFromIndex(index, columns, rows);
  const found = records.find((record) => record.row === coord.row && record.col === coord.col);
  return found ? cloneCell(found.cell) : null;
};

export const setCellAtIndex = (
  records: KeypadCellRecord[],
  index: number,
  columns: number,
  rows: number,
  cell: LayoutCell,
): KeypadCellRecord[] => {
  const coord = toCoordFromIndex(index, columns, rows);
  const next = records.map((record) =>
    record.row === coord.row && record.col === coord.col ? { ...record, cell: cloneCell(cell) } : record,
  );
  return next;
};

export const getSlotIdAtIndex = (index: number, columns: number, rows: number): SlotId => {
  const coord = toCoordFromIndex(index, columns, rows);
  return generateSlotId(coord.row, coord.col);
};
