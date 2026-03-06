import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Window } from "happy-dom";

type InstalledDomHarness = {
  window: Window;
  document: Document;
  root: HTMLElement;
  teardown: () => void;
};

type GlobalKey =
  | "window"
  | "document"
  | "HTMLElement"
  | "Element"
  | "Node"
  | "Event"
  | "MouseEvent"
  | "KeyboardEvent"
  | "PointerEvent"
  | "performance"
  | "requestAnimationFrame"
  | "cancelAnimationFrame";

const GLOBAL_KEYS: GlobalKey[] = [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "PointerEvent",
  "performance",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];

export const installDomHarness = (url: string = "http://localhost:4173/index.html"): InstalledDomHarness => {
  const previous = new Map<GlobalKey, unknown>();
  for (const key of GLOBAL_KEYS) {
    previous.set(key, (globalThis as Record<string, unknown>)[key]);
  }

  const window = new Window({ url });
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  window.document.write(html);
  window.document.close();

  const assignGlobal = (key: GlobalKey, value: unknown): void => {
    try {
      (globalThis as Record<string, unknown>)[key] = value;
    } catch {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    }
  };

  assignGlobal("window", window);
  assignGlobal("document", window.document);
  assignGlobal("HTMLElement", window.HTMLElement);
  assignGlobal("Element", window.Element);
  assignGlobal("Node", window.Node);
  assignGlobal("Event", window.Event);
  assignGlobal("MouseEvent", window.MouseEvent);
  assignGlobal("KeyboardEvent", window.KeyboardEvent);
  assignGlobal("PointerEvent", window.PointerEvent ?? window.MouseEvent);
  assignGlobal("performance", window.performance);
  assignGlobal("requestAnimationFrame", window.requestAnimationFrame.bind(window));
  assignGlobal("cancelAnimationFrame", window.cancelAnimationFrame.bind(window));

  const root = window.document.querySelector("#app") as unknown as HTMLElement | null;
  if (!root) {
    throw new Error("DOM harness could not find #app.");
  }

  const teardown = (): void => {
    for (const key of GLOBAL_KEYS) {
      (globalThis as Record<string, unknown>)[key] = previous.get(key);
    }
    window.close();
  };

  return {
    window,
    document: window.document as unknown as Document,
    root,
    teardown,
  };
};
