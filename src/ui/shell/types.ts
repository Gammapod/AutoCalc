export type ShellRefs = {
  shell: HTMLElement;
  main: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  sectionCalc: HTMLElement;
  sectionStorage: HTMLElement;
  middleDrawerViewport: HTMLElement;
  middleDrawerTrack: HTMLElement;
  middleDrawerPanelCalculator: HTMLElement;
  middleDrawerPanelChecklist: HTMLElement;
  bottomDrawerViewport: HTMLElement;
  bottomDrawerTrack: HTMLElement;
  bottomDrawerPanelStorage: HTMLElement;
  bottomDrawerPanelChecklist: HTMLElement;
  controlsUp: HTMLButtonElement;
  controlsDown: HTMLButtonElement;
  controlsMenu: HTMLButtonElement;
  menu: HTMLElement;
  menuNavChecklist: HTMLButtonElement;
  menuPanelChecklist: HTMLElement;
  calcDevice: HTMLElement;
  keys: HTMLElement;
  storageKeys: HTMLElement;
};

export type DrawerDragTarget = "middle" | "bottom";

export type PointerSession = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTimeMs: number;
  axisLock: "none" | "x" | "y";
  startedInRightEdgeZone: boolean;
  startedInStorage: boolean;
  startedInChecklist: boolean;
  preferredDrawerTarget: DrawerDragTarget;
  startedInMenu: boolean;
};
