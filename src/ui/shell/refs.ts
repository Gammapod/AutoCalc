import type { ShellRefs } from "./types.js";

export const buildRefsFromExistingShell = (root: Element): ShellRefs | null => {
  const shell = root.querySelector<HTMLElement>("[data-v2-shell-root='true']");
  if (!shell) {
    return null;
  }
  const main = shell.querySelector<HTMLElement>("[data-v2-main='true']");
  const viewport = shell.querySelector<HTMLElement>("[data-v2-viewport='true']");
  const track = shell.querySelector<HTMLElement>("[data-v2-track='true']");
  const sectionCalc = shell.querySelector<HTMLElement>("[data-v2-section='calc']");
  const sectionStorage = shell.querySelector<HTMLElement>("[data-v2-section='storage']");
  const middleDrawerViewport = shell.querySelector<HTMLElement>("[data-v2-middle-drawer-viewport='true']");
  const middleDrawerTrack = shell.querySelector<HTMLElement>("[data-v2-middle-drawer-track='true']");
  const middleDrawerPanelCalculator = shell.querySelector<HTMLElement>("[data-v2-middle-panel='calculator']");
  const bottomDrawerViewport = shell.querySelector<HTMLElement>("[data-v2-bottom-drawer-viewport='true']");
  const bottomDrawerTrack = shell.querySelector<HTMLElement>("[data-v2-bottom-drawer-track='true']");
  const bottomDrawerPanelStorage = shell.querySelector<HTMLElement>("[data-v2-drawer-panel='storage']");
  const controlsUp = shell.querySelector<HTMLButtonElement>("[data-v2-control='up']");
  const controlsDown = shell.querySelector<HTMLButtonElement>("[data-v2-control='down']");
  const controlsMenu = shell.querySelector<HTMLButtonElement>("[data-v2-control='menu']");
  const menu = shell.querySelector<HTMLElement>("[data-v2-menu='true']");
  const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const keys = root.querySelector<HTMLElement>("[data-keys]");
  const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
  if (
    !main ||
    !viewport ||
    !track ||
    !sectionCalc ||
    !sectionStorage ||
    !middleDrawerViewport ||
    !middleDrawerTrack ||
    !middleDrawerPanelCalculator ||
    !bottomDrawerViewport ||
    !bottomDrawerTrack ||
    !bottomDrawerPanelStorage ||
    !controlsUp ||
    !controlsDown ||
    !controlsMenu ||
    !menu ||
    !calcDevice ||
    !keys ||
    !storageKeys
  ) {
    return null;
  }
  return {
    shell,
    main,
    viewport,
    track,
    sectionCalc,
    sectionStorage,
    middleDrawerViewport,
    middleDrawerTrack,
    middleDrawerPanelCalculator,
    bottomDrawerViewport,
    bottomDrawerTrack,
    bottomDrawerPanelStorage,
    controlsUp,
    controlsDown,
    controlsMenu,
    menu,
    calcDevice,
    keys,
    storageKeys,
  };
};

export const createShellDom = (root: Element): ShellRefs => {
  const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const storageSection = root.querySelector<HTMLElement>(".storage");
  const keys = root.querySelector<HTMLElement>("[data-keys]");
  const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
  if (!calcDevice || !storageSection || !keys || !storageKeys) {
    throw new Error("V2 shell could not find required modules.");
  }

  const shell = document.createElement("div");
  shell.className = "v2-shell";
  shell.dataset.v2ShellRoot = "true";

  const main = document.createElement("section");
  main.className = "v2-main";
  main.dataset.v2Main = "true";

  const viewport = document.createElement("div");
  viewport.className = "v2-stack-viewport";
  viewport.dataset.v2Viewport = "true";

  const track = document.createElement("div");
  track.className = "v2-stack-track";
  track.dataset.v2Track = "true";

  const sectionCalc = document.createElement("section");
  sectionCalc.className = "v2-stack-section v2-stack-section--calc";
  sectionCalc.dataset.v2Section = "calc";
  const middleDrawerViewport = document.createElement("div");
  middleDrawerViewport.className = "v2-middle-drawer-viewport";
  middleDrawerViewport.dataset.v2MiddleDrawerViewport = "true";
  const middleDrawerTrack = document.createElement("div");
  middleDrawerTrack.className = "v2-middle-drawer-track";
  middleDrawerTrack.dataset.v2MiddleDrawerTrack = "true";
  const middleDrawerPanelCalculator = document.createElement("section");
  middleDrawerPanelCalculator.className = "v2-middle-drawer-panel";
  middleDrawerPanelCalculator.dataset.v2MiddlePanel = "calculator";

  const sectionStorage = document.createElement("section");
  sectionStorage.className = "v2-stack-section v2-stack-section--storage";
  sectionStorage.dataset.v2Section = "storage";
  const bottomDrawerViewport = document.createElement("div");
  bottomDrawerViewport.className = "v2-bottom-drawer-viewport";
  bottomDrawerViewport.dataset.v2BottomDrawerViewport = "true";
  const bottomDrawerTrack = document.createElement("div");
  bottomDrawerTrack.className = "v2-bottom-drawer-track";
  bottomDrawerTrack.dataset.v2BottomDrawerTrack = "true";
  const bottomDrawerPanelStorage = document.createElement("section");
  bottomDrawerPanelStorage.className = "v2-bottom-drawer-panel";
  bottomDrawerPanelStorage.dataset.v2DrawerPanel = "storage";

  middleDrawerPanelCalculator.appendChild(calcDevice);
  middleDrawerTrack.append(middleDrawerPanelCalculator);
  middleDrawerViewport.appendChild(middleDrawerTrack);
  sectionCalc.appendChild(middleDrawerViewport);
  bottomDrawerPanelStorage.appendChild(storageSection);
  bottomDrawerTrack.append(bottomDrawerPanelStorage);
  bottomDrawerViewport.appendChild(bottomDrawerTrack);
  sectionStorage.appendChild(bottomDrawerViewport);

  track.append(sectionCalc, sectionStorage);
  viewport.appendChild(track);

  const controls = document.createElement("div");
  controls.className = "v2-shell-controls";

  const controlsUp = document.createElement("button");
  controlsUp.type = "button";
  controlsUp.className = "v2-shell-control";
  controlsUp.dataset.v2Control = "up";
  controlsUp.textContent = "Up";

  const controlsDown = document.createElement("button");
  controlsDown.type = "button";
  controlsDown.className = "v2-shell-control";
  controlsDown.dataset.v2Control = "down";
  controlsDown.textContent = "Down";

  const controlsMenu = document.createElement("button");
  controlsMenu.type = "button";
  controlsMenu.className = "v2-shell-control";
  controlsMenu.dataset.v2Control = "menu";
  controlsMenu.textContent = "Menu";

  controls.append(controlsUp, controlsDown, controlsMenu);
  main.append(viewport, controls);

  const menu = document.createElement("aside");
  menu.className = "v2-menu";
  menu.dataset.v2Menu = "true";
  menu.setAttribute("aria-label", "Module menu");

  shell.append(main, menu);
  root.appendChild(shell);

  return {
    shell,
    main,
    viewport,
    track,
    sectionCalc,
    sectionStorage,
    middleDrawerViewport,
    middleDrawerTrack,
    middleDrawerPanelCalculator,
    bottomDrawerViewport,
    bottomDrawerTrack,
    bottomDrawerPanelStorage,
    controlsUp,
    controlsDown,
    controlsMenu,
    menu,
    calcDevice,
    keys,
    storageKeys,
  };
};
