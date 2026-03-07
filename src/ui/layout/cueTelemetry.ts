import type { CueKind, CuePhase } from "./cueLifecycle.js";

export type CueTelemetryEvent = {
  cueKind: CueKind;
  phase: CuePhase;
  atMs: number;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export type CueTelemetryListener = (event: CueTelemetryEvent) => void;

const listeners = new Set<CueTelemetryListener>();

export const subscribeCueTelemetry = (listener: CueTelemetryListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitCueTelemetry = (event: CueTelemetryEvent): void => {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Cue telemetry listener failed", error);
    }
  }
};

export const resetCueTelemetryForTests = (): void => {
  listeners.clear();
};
