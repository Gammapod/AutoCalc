export type CenteredSeparatorRowElements = {
  row: HTMLDivElement;
  leftRegion: HTMLDivElement;
  separator: HTMLSpanElement;
  rightRegion: HTMLDivElement;
};

export const createCenteredSeparatorRow = (options: {
  rowClassName: string;
  leftClassName: string;
  separatorClassName: string;
  rightClassName: string;
  separatorText?: string;
}): CenteredSeparatorRowElements => {
  const row = document.createElement("div");
  row.className = options.rowClassName;

  const leftRegion = document.createElement("div");
  leftRegion.className = options.leftClassName;

  const separator = document.createElement("span");
  separator.className = options.separatorClassName;
  separator.textContent = options.separatorText ?? ":";

  const rightRegion = document.createElement("div");
  rightRegion.className = options.rightClassName;

  row.append(leftRegion, separator, rightRegion);
  return { row, leftRegion, separator, rightRegion };
};

