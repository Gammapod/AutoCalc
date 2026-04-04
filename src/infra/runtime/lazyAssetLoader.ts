type AssetId = "katex" | "chart" | "algebrite";

type AssetSpec = {
  id: AssetId;
  src: string;
  isReady: () => boolean;
};

const ASSET_SPECS: Record<AssetId, AssetSpec> = {
  katex: {
    id: "katex",
    src: "./node_modules/katex/dist/katex.min.js",
    isReady: () => {
      const scope = globalThis as typeof globalThis & { katex?: unknown };
      return Boolean(scope.katex);
    },
  },
  chart: {
    id: "chart",
    src: "./node_modules/chart.js/dist/chart.umd.min.js",
    isReady: () => {
      const scope = globalThis as typeof globalThis & { window?: { Chart?: unknown } };
      return Boolean(scope.window?.Chart);
    },
  },
  algebrite: {
    id: "algebrite",
    src: "./node_modules/algebrite/dist/algebrite.bundle-for-browser.js",
    isReady: () => {
      const scope = globalThis as typeof globalThis & { Algebrite?: unknown };
      return Boolean(scope.Algebrite);
    },
  },
};

const inFlightByAsset = new Map<AssetId, Promise<boolean>>();

const ensureAssetLoaded = (asset: AssetSpec): Promise<boolean> => {
  if (asset.isReady()) {
    return Promise.resolve(true);
  }
  if (typeof document === "undefined") {
    return Promise.resolve(false);
  }

  const inFlight = inFlightByAsset.get(asset.id);
  if (inFlight) {
    return inFlight;
  }

  const promise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = asset.src;
    script.async = true;
    script.defer = true;
    script.dataset.autocalcAsset = asset.id;

    const finalize = (success: boolean): void => {
      inFlightByAsset.delete(asset.id);
      resolve(success && asset.isReady());
    };

    script.addEventListener("load", () => finalize(true), { once: true });
    script.addEventListener("error", () => finalize(false), { once: true });
    document.head.appendChild(script);
  });

  inFlightByAsset.set(asset.id, promise);
  return promise;
};

export const ensureKatexLoaded = (): Promise<boolean> => ensureAssetLoaded(ASSET_SPECS.katex);
export const ensureChartLoaded = (): Promise<boolean> => ensureAssetLoaded(ASSET_SPECS.chart);
export const ensureAlgebriteLoaded = (): Promise<boolean> => ensureAssetLoaded(ASSET_SPECS.algebrite);

export const resetLazyAssetLoaderForTests = (): void => {
  inFlightByAsset.clear();
};

