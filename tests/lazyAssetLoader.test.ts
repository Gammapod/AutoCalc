import assert from "node:assert/strict";
import {
  ensureAlgebriteLoaded,
  ensureChartLoaded,
  ensureKatexLoaded,
  resetLazyAssetLoaderForTests,
} from "../src/infra/runtime/lazyAssetLoader.js";

type Listener = () => void;

type FakeScript = {
  src: string;
  async: boolean;
  defer: boolean;
  dataset: Record<string, string>;
  addEventListener: (type: "load" | "error", listener: Listener, options?: { once?: boolean }) => void;
  emit: (type: "load" | "error") => void;
};

const createFakeScript = (): FakeScript => {
  const listeners: Record<"load" | "error", Listener[]> = {
    load: [],
    error: [],
  };
  return {
    src: "",
    async: false,
    defer: false,
    dataset: {},
    addEventListener: (type, listener, options) => {
      if (options?.once) {
        listeners[type].push(() => {
          listener();
          listeners[type] = listeners[type].filter((entry) => entry !== listener);
        });
        return;
      }
      listeners[type].push(listener);
    },
    emit: (type) => {
      const active = [...listeners[type]];
      for (const listener of active) {
        listener();
      }
    },
  };
};

const installFakeDom = (): {
  scripts: FakeScript[];
  teardown: () => void;
} => {
  const previousDocument = (globalThis as { document?: unknown }).document;
  const scripts: FakeScript[] = [];
  const fakeDocument = {
    head: {
      appendChild: (script: FakeScript) => {
        scripts.push(script);
      },
    },
    createElement: (tag: string): FakeScript => {
      if (tag !== "script") {
        throw new Error(`unexpected tag: ${tag}`);
      }
      return createFakeScript();
    },
  };
  (globalThis as { document?: unknown }).document = fakeDocument;
  return {
    scripts,
    teardown: () => {
      (globalThis as { document?: unknown }).document = previousDocument;
    },
  };
};

export const runLazyAssetLoaderTests = async (): Promise<void> => {
  const previousDocument = (globalThis as { document?: unknown }).document;
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousKatex = (globalThis as typeof globalThis & { katex?: unknown }).katex;
  const previousAlgebrite = (globalThis as typeof globalThis & { Algebrite?: unknown }).Algebrite;
  const previousChart =
    (globalThis as typeof globalThis & { window?: { Chart?: unknown } }).window?.Chart;

  try {
    {
      resetLazyAssetLoaderForTests();
      (globalThis as typeof globalThis & { katex?: unknown }).katex = undefined;
      const harness = installFakeDom();
      try {
        const promiseA = ensureKatexLoaded();
        const promiseB = ensureKatexLoaded();
        assert.equal(promiseA, promiseB, "repeated calls share one in-flight promise for same asset");
        assert.equal(harness.scripts.length, 1, "loader injects one script element for repeated requests");
        (globalThis as typeof globalThis & { katex?: unknown }).katex = { render: () => {} };
        harness.scripts[0].emit("load");
        assert.equal(await promiseA, true, "loader resolves true when global becomes available on load");
      } finally {
        harness.teardown();
      }
    }

    {
      resetLazyAssetLoaderForTests();
      const globalRecord = globalThis as Record<string, unknown>;
      const existingWindow = globalRecord.window as { Chart?: unknown } | undefined;
      if (!existingWindow) {
        globalRecord.window = {} as { Chart?: unknown };
      }
      ((globalRecord.window as { Chart?: unknown })).Chart = undefined;
      const harness = installFakeDom();
      try {
        const promise = ensureChartLoaded();
        assert.equal(harness.scripts.length, 1, "chart loader injects script");
        harness.scripts[0].emit("error");
        assert.equal(await promise, false, "loader resolves false on script load failure");
      } finally {
        harness.teardown();
      }
    }

    {
      resetLazyAssetLoaderForTests();
      (globalThis as typeof globalThis & { Algebrite?: unknown }).Algebrite = undefined;
      const harness = installFakeDom();
      try {
        const promise = ensureAlgebriteLoaded();
        assert.equal(harness.scripts.length, 1, "algebrite loader injects script");
        (globalThis as typeof globalThis & { Algebrite?: unknown }).Algebrite = {
          simplify: () => "0",
        };
        harness.scripts[0].emit("load");
        assert.equal(await promise, true, "loader resolves true when algebrite global is available");
      } finally {
        harness.teardown();
      }
    }
  } finally {
    resetLazyAssetLoaderForTests();
    (globalThis as { document?: unknown }).document = previousDocument;
    (globalThis as { window?: unknown }).window = previousWindow;
    (globalThis as typeof globalThis & { katex?: unknown }).katex = previousKatex;
    (globalThis as typeof globalThis & { Algebrite?: unknown }).Algebrite = previousAlgebrite;
    const scope = globalThis as typeof globalThis & { window?: { Chart?: unknown } };
    if (scope.window) {
      scope.window.Chart = previousChart;
    }
  }
};
