import type { Action, GameState, Key, LayoutSurface } from "../../../domain/types.js";
import { evaluateLayoutDrop } from "../../../domain/layoutRules.js";
import { getInputModuleState, type DragTarget, type DropAction } from "./runtime.js";

const DRAG_START_THRESHOLD_PX = 6;
const DRAG_CLICK_SUPPRESS_MS = 220;

export const buildLayoutDropDispatchAction = (
  source: { surface: LayoutSurface; index: number },
  target: { surface: LayoutSurface; index: number },
  action: DropAction,
): Action =>
  action === "move"
    ? {
        type: "MOVE_LAYOUT_CELL",
        fromSurface: source.surface,
        fromIndex: source.index,
        toSurface: target.surface,
        toIndex: target.index,
      }
    : {
        type: "SWAP_LAYOUT_CELLS",
        fromSurface: source.surface,
        fromIndex: source.index,
        toSurface: target.surface,
        toIndex: target.index,
      };

export const shouldStartDragFromDelta = (
  deltaX: number,
  deltaY: number,
  thresholdPx: number = DRAG_START_THRESHOLD_PX,
): boolean => deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
): DropAction | null => {
  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed ? decision.action : null;
};

const parseDragTarget = (value: unknown): DragTarget | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const target = value as { surface?: unknown; index?: unknown };
  if (
    (target.surface !== "keypad" && target.surface !== "keypad_f" && target.surface !== "keypad_g" && target.surface !== "storage")
    || typeof target.index !== "number"
  ) {
    return null;
  }
  if (!Number.isInteger(target.index) || target.index < 0) {
    return null;
  }
  return { surface: target.surface, index: target.index };
};

const findDragTargetElement = (target: DragTarget): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    `[data-layout-surface="${target.surface}"][data-layout-index="${target.index.toString()}"]`,
  );

const clearDragDecorations = (): void => {
  document.querySelectorAll(".drop-target-valid, .drop-target-invalid, .drag-source").forEach((node) => {
    node.classList.remove("drop-target-valid", "drop-target-invalid", "drag-source");
  });
};

const clearDragSession = (root: Element): void => {
  const state = getInputModuleState(root);
  if (!state.dragSession) {
    return;
  }
  state.dragSession.ghost?.remove();
  clearDragDecorations();
  state.dragSession = null;
};

const onDragMove = (root: Element, event: MouseEvent): void => {
  const state = getInputModuleState(root);
  if (!state.dragSession) {
    return;
  }
  const dragSession = state.dragSession;

  const deltaX = event.clientX - dragSession.originX;
  const deltaY = event.clientY - dragSession.originY;
  if (!dragSession.active && !shouldStartDragFromDelta(deltaX, deltaY)) {
    return;
  }

  if (!dragSession.active) {
    dragSession.active = true;
    state.suppressClicksUntil = Date.now() + DRAG_CLICK_SUPPRESS_MS;
    dragSession.originElement.classList.add("drag-source");
    const ghost = dragSession.originElement.cloneNode(true) as HTMLElement;
    ghost.classList.remove("drag-source", "drop-target-valid", "drop-target-invalid");
    ghost.classList.add("drag-ghost");
    ghost.style.width = `${Math.round(dragSession.originElement.getBoundingClientRect().width)}px`;
    document.body.appendChild(ghost);
    dragSession.ghost = ghost;
  }

  dragSession.ghost?.style.setProperty("left", `${event.clientX + 12}px`);
  dragSession.ghost?.style.setProperty("top", `${event.clientY + 12}px`);

  const hovered = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
  const targetNode = hovered?.closest<HTMLElement>("[data-layout-surface][data-layout-index]") ?? null;
  clearDragDecorations();
  dragSession.originElement.classList.add("drag-source");
  if (!targetNode) {
    dragSession.target = null;
    dragSession.targetAction = null;
    dragSession.targetElement = null;
    return;
  }

  const surface = targetNode.dataset.layoutSurface;
  const indexRaw = targetNode.dataset.layoutIndex;
  const parsed = parseDragTarget({ surface, index: indexRaw ? Number(indexRaw) : NaN });
  if (!parsed) {
    dragSession.target = null;
    dragSession.targetAction = null;
    dragSession.targetElement = null;
    targetNode.classList.add("drop-target-invalid");
    return;
  }

  const action = classifyDropAction(dragSession.state, dragSession.source, parsed);
  dragSession.target = parsed;
  dragSession.targetAction = action;
  dragSession.targetElement = targetNode;
  targetNode.classList.add(action ? "drop-target-valid" : "drop-target-invalid");
};

const onDragUp = (root: Element): void => {
  const state = getInputModuleState(root);
  if (!state.dragSession) {
    return;
  }
  const dragSession = state.dragSession;
  if (dragSession.active && dragSession.target && dragSession.targetAction) {
    dragSession.dispatch(buildLayoutDropDispatchAction(dragSession.source, dragSession.target, dragSession.targetAction));
  }
  clearDragSession(root);
};

export const bindDraggableCell = (
  root: Element,
  element: HTMLElement,
  state: GameState,
  dispatch: (action: Action) => unknown,
  source: DragTarget,
  key: Key,
): void => {
  element.dataset.layoutSurface = source.surface;
  element.dataset.layoutIndex = source.index.toString();
  element.dataset.layoutOccupied = "key";
  const runtimeState = getInputModuleState(root);
  if (runtimeState.boundDraggableElements.has(element)) {
    return;
  }
  runtimeState.boundDraggableElements.add(element);

  element.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (element instanceof HTMLButtonElement && element.disabled) {
      return;
    }
    const currentState = getInputModuleState(root);
    clearDragSession(root);
    currentState.dragSession = {
      state,
      dispatch,
      source,
      key,
      originElement: element,
      originX: event.clientX,
      originY: event.clientY,
      ghost: null,
      active: false,
      target: null,
      targetAction: null,
      targetElement: null,
    };
    const handleMove = (moveEvent: MouseEvent): void => {
      onDragMove(root, moveEvent);
    };
    const handleUp = (): void => {
      window.removeEventListener("mousemove", handleMove);
      onDragUp(root);
    };
    window.addEventListener("mousemove", handleMove, { once: false });
    window.addEventListener("mouseup", handleUp, { once: true });
  });
};

export const syncInputDragSessionAfterRender = (root: Element): void => {
  const state = getInputModuleState(root);
  if (!state.dragSession?.active) {
    return;
  }
  const sourceNode = findDragTargetElement(state.dragSession.source);
  if (!sourceNode) {
    clearDragSession(root);
    return;
  }
  state.dragSession.originElement = sourceNode;
  sourceNode.classList.add("drag-source");
};

export const bindDropTargetCell = (element: HTMLElement, surface: LayoutSurface, index: number): void => {
  element.dataset.layoutSurface = surface;
  element.dataset.layoutIndex = index.toString();
};
