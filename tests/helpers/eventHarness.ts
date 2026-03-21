export const click = (target: Element): void => {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
};

export const keydown = (target: EventTarget, key: string): void => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
};

export const pointer = (
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  options: {
    pointerId?: number;
    pointerType?: string;
    button?: number;
    clientX?: number;
    clientY?: number;
  } = {},
): void => {
  const EventCtor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    pointerId: options.pointerId ?? 1,
    pointerType: options.pointerType ?? "mouse",
    button: options.button ?? 0,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
  } as MouseEventInit);
  target.dispatchEvent(event);
};

