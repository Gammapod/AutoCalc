import type { Action, CalculatorId, GameState, UiEffect } from "../../domain/types.js";
import { renderCalculatorV2Module } from "./calculator/render.js";
import { renderStorageV2Module } from "./storage/render.js";
import { renderInputV2Module } from "./input/render.js";
import { projectCalculatorToLegacy, resolveActiveCalculatorId } from "../../domain/multiCalculator.js";

type CalculatorRenderer = typeof renderCalculatorV2Module;

let calculatorRenderer: CalculatorRenderer = renderCalculatorV2Module;

type DesktopCalculatorRenderCacheEntry = {
  signature: string;
};

const desktopCalculatorRenderCache = new WeakMap<Element, DesktopCalculatorRenderCacheEntry>();
const objectIdentityTokens = new WeakMap<object, number>();
let nextObjectIdentityToken = 1;

const getObjectIdentityToken = (value: object | null | undefined): string => {
  if (!value) {
    return "none";
  }
  const existing = objectIdentityTokens.get(value);
  if (existing !== undefined) {
    return existing.toString();
  }
  const token = nextObjectIdentityToken;
  nextObjectIdentityToken += 1;
  objectIdentityTokens.set(value, token);
  return token.toString();
};

const appendRecordSignature = (
  parts: string[],
  prefix: string,
  record: Record<string, boolean | number | undefined>,
): void => {
  for (const key of Object.keys(record).sort()) {
    parts.push(`${prefix}:${key}=${String(record[key])}`);
  }
};

const buildUnlockRenderSignature = (unlocks: GameState["unlocks"]): string => {
  const parts: string[] = [
    `maxSlots=${unlocks.maxSlots.toString()}`,
    `maxTotalDigits=${unlocks.maxTotalDigits.toString()}`,
    `storageVisible=${String(unlocks.uiUnlocks.storageVisible)}`,
  ];
  appendRecordSignature(parts, "valueAtoms", unlocks.valueAtoms);
  appendRecordSignature(parts, "valueCompose", unlocks.valueCompose);
  appendRecordSignature(parts, "valueExpression", unlocks.valueExpression);
  appendRecordSignature(parts, "slotOperators", unlocks.slotOperators);
  appendRecordSignature(parts, "unaryOperators", unlocks.unaryOperators);
  appendRecordSignature(parts, "utilities", unlocks.utilities);
  appendRecordSignature(parts, "memory", unlocks.memory);
  appendRecordSignature(parts, "steps", unlocks.steps);
  appendRecordSignature(parts, "visualizers", unlocks.visualizers);
  appendRecordSignature(parts, "execution", unlocks.execution);
  appendRecordSignature(parts, "installedOnly", unlocks.installedOnly);
  return parts.join(";");
};

const buildUiRenderSignature = (ui: GameState["ui"] | undefined): string => {
  if (!ui) {
    return "none";
  }
  const parts: string[] = [
    `keyLayout=${getObjectIdentityToken(ui.keyLayout)}`,
    `columns=${ui.keypadColumns.toString()}`,
    `rows=${ui.keypadRows.toString()}`,
    `activeVisualizer=${ui.activeVisualizer}`,
  ];
  appendRecordSignature(parts, "flags", ui.buttonFlags);
  return parts.join(";");
};

const buildDesktopCalculatorRenderSignature = (
  state: GameState,
  calculatorId: CalculatorId,
  inputBlocked: boolean,
): string => {
  const instance = state.calculators?.[calculatorId];
  return [
    getObjectIdentityToken(instance?.calculator),
    getObjectIdentityToken(instance?.settings),
    getObjectIdentityToken(instance?.lambdaControl),
    buildUiRenderSignature(instance?.ui),
    buildUnlockRenderSignature(state.unlocks),
    inputBlocked ? "blocked" : "open",
  ].join("|");
};

export const setCalculatorRendererForTests = (renderer: CalculatorRenderer): void => {
  calculatorRenderer = renderer;
};

export const resetCalculatorRendererForTests = (): void => {
  calculatorRenderer = renderCalculatorV2Module;
};

export const renderCalculatorStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    inputBlocked: boolean;
    uiEffects: UiEffect[];
  },
): void => {
  const executionRejectCountFor = (calculatorId: CalculatorId): number =>
    options.uiEffects.filter((effect) => effect.type === "execution_gate_rejected" && effect.calculatorId === calculatorId).length;
  const latestInputOutcomeByCalculator = options.uiEffects.reduce<Partial<Record<CalculatorId, "accepted" | "rejected">>>(
    (acc, effect) => {
      if (effect.type === "input_feedback" && effect.trigger !== "system_action") {
        acc[effect.calculatorId] = effect.outcome;
      }
      return acc;
    },
    {},
  );
  const countUiEffectFor = (
    calculatorId: CalculatorId,
    effectType: Extract<UiEffect["type"], "builder_changed" | "settings_changed" | "roll_updated" | "substep_executed">,
  ): number =>
    options.uiEffects.filter((effect) => effect.type === effectType && effect.calculatorId === calculatorId).length;
  const countUnlockCompletedFor = (calculatorId: CalculatorId): number => {
    const activeCalculatorId = resolveActiveCalculatorId(state);
    return options.uiEffects.filter((effect) =>
      effect.type === "unlock_completed"
      && ((effect.calculatorId ?? activeCalculatorId) === calculatorId)).length;
  };
  const feedbackPulseFor = (
    calculatorId: CalculatorId,
  ): {
    rejectedInputCount: number;
    builderChangedCount: number;
    settingsChangedCount: number;
    rollUpdatedCount: number;
    substepExecutedCount: number;
    substepExecutedToneFrequenciesHz: number[];
    unlockCompletedCount: number;
  } => {
    const outcome = latestInputOutcomeByCalculator[calculatorId];
    const substepEffects = options.uiEffects.filter(
      (effect): effect is Extract<UiEffect, { type: "substep_executed" }> =>
        effect.type === "substep_executed" && effect.calculatorId === calculatorId,
    );
    return {
      rejectedInputCount: outcome === "rejected" ? 1 : 0,
      builderChangedCount: countUiEffectFor(calculatorId, "builder_changed"),
      settingsChangedCount: countUiEffectFor(calculatorId, "settings_changed"),
      rollUpdatedCount: countUiEffectFor(calculatorId, "roll_updated"),
      substepExecutedCount: substepEffects.length,
      substepExecutedToneFrequenciesHz: substepEffects
        .map((effect) => effect.toneFrequencyHz)
        .filter((frequencyHz): frequencyHz is number => typeof frequencyHz === "number" && Number.isFinite(frequencyHz)),
      unlockCompletedCount: countUnlockCompletedFor(calculatorId),
    };
  };
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const switchRow = calculatorDevice?.querySelector<HTMLElement>("[data-calc-switch-row]");
  const calculatorOrder = state.calculatorOrder ?? ["f"];
  const hasMultiple = calculatorOrder.length > 1;
  const hasInstanceNodes = Boolean(calculatorDevice?.querySelector("[data-calc-instance-id]"));
  const uiShellMode = calculatorDevice?.ownerDocument?.body?.dataset.uiShell;
  const useDesktopInstanceTrack = uiShellMode === "desktop";
  if (hasMultiple && calculatorDevice && hasInstanceNodes) {
    if (switchRow) {
      switchRow.hidden = useDesktopInstanceTrack;
    }
    const activeCalculatorId = resolveActiveCalculatorId(state);
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
    if (!useDesktopInstanceTrack) {
      const switchButtons = calculatorDevice.querySelectorAll<HTMLButtonElement>("[data-calc-switch]");
      switchButtons.forEach((button) => {
        const target = button.dataset.calcSwitch as CalculatorId | undefined;
        button.setAttribute("aria-pressed", target === activeCalculatorId ? "true" : "false");
        button.hidden = !target || !calculatorOrder.includes(target);
        button.onclick = () => {
          if (!target || !calculatorOrder.includes(target)) {
            return;
          }
          dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId: target });
        };
      });
    }

    const instances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    let activeInstanceRendered = false;
    instances.forEach((instanceEl) => {
      const id = instanceEl.dataset.calcInstanceId as CalculatorId | undefined;
      if (!id || !calculatorOrder.includes(id)) {
        instanceEl.hidden = true;
        return;
      }
      if (useDesktopInstanceTrack) {
        const isActive = id === activeCalculatorId;
        instanceEl.hidden = false;
        instanceEl.dataset.calcActive = isActive ? "true" : "false";
        instanceEl.onclick = () => {
          dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId: id });
        };
        const feedbackPulse = feedbackPulseFor(id);
        const hasFeedbackPulse =
          executionRejectCountFor(id) > 0
          || feedbackPulse.rejectedInputCount > 0
          || feedbackPulse.builderChangedCount > 0
          || feedbackPulse.settingsChangedCount > 0
          || feedbackPulse.rollUpdatedCount > 0
          || feedbackPulse.substepExecutedCount > 0
          || feedbackPulse.unlockCompletedCount > 0;
        const signature = buildDesktopCalculatorRenderSignature(state, id, options.inputBlocked);
        const previous = desktopCalculatorRenderCache.get(instanceEl);
        if (!isActive && !hasFeedbackPulse && previous?.signature === signature) {
          return;
        }
        const projected = projectCalculatorToLegacy(state, id);
        calculatorRenderer(instanceEl, projected, dispatch, {
          inputBlocked: options.inputBlocked,
          executionGateRejectCount: executionRejectCountFor(id),
          rejectedInputCount: feedbackPulse.rejectedInputCount,
          builderChangedCount: feedbackPulse.builderChangedCount,
          settingsChangedCount: feedbackPulse.settingsChangedCount,
          rollUpdatedCount: feedbackPulse.rollUpdatedCount,
          substepExecutedCount: feedbackPulse.substepExecutedCount,
          substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
          unlockCompletedCount: feedbackPulse.unlockCompletedCount,
        });
        desktopCalculatorRenderCache.set(instanceEl, { signature });
        activeInstanceRendered = true;
        return;
      }
      const isActive = id === activeCalculatorId;
      instanceEl.hidden = !isActive;
      if (!isActive) {
        return;
      }
      activeInstanceRendered = true;
      const projected = projectCalculatorToLegacy(state, id);
      const feedbackPulse = feedbackPulseFor(id);
      calculatorRenderer(instanceEl, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(id),
        rejectedInputCount: feedbackPulse.rejectedInputCount,
        builderChangedCount: feedbackPulse.builderChangedCount,
        settingsChangedCount: feedbackPulse.settingsChangedCount,
        rollUpdatedCount: feedbackPulse.rollUpdatedCount,
        substepExecutedCount: feedbackPulse.substepExecutedCount,
        substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
        unlockCompletedCount: feedbackPulse.unlockCompletedCount,
      });
    });
    if (!activeInstanceRendered) {
      const projected = projectCalculatorToLegacy(state, activeCalculatorId);
      const feedbackPulse = feedbackPulseFor(activeCalculatorId);
      calculatorRenderer(root, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        rejectedInputCount: feedbackPulse.rejectedInputCount,
        builderChangedCount: feedbackPulse.builderChangedCount,
        settingsChangedCount: feedbackPulse.settingsChangedCount,
        rollUpdatedCount: feedbackPulse.rollUpdatedCount,
        substepExecutedCount: feedbackPulse.substepExecutedCount,
        substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
        unlockCompletedCount: feedbackPulse.unlockCompletedCount,
      });
    }
  } else if (calculatorDevice) {
    const activeCalculatorId = resolveActiveCalculatorId(state);
    const activeInstance = calculatorDevice.querySelector<HTMLElement>(`[data-calc-instance-id='${activeCalculatorId}']`);
    const allInstances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
    if (switchRow) {
      switchRow.hidden = true;
    }
    allInstances.forEach((instanceEl) => {
      instanceEl.hidden = instanceEl !== activeInstance;
      if (instanceEl !== activeInstance) {
        return;
      }
      const feedbackPulse = feedbackPulseFor(activeCalculatorId);
      calculatorRenderer(instanceEl, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        rejectedInputCount: feedbackPulse.rejectedInputCount,
        builderChangedCount: feedbackPulse.builderChangedCount,
        settingsChangedCount: feedbackPulse.settingsChangedCount,
        rollUpdatedCount: feedbackPulse.rollUpdatedCount,
        substepExecutedCount: feedbackPulse.substepExecutedCount,
        substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
        unlockCompletedCount: feedbackPulse.unlockCompletedCount,
      });
    });
    if (!activeInstance) {
      const feedbackPulse = feedbackPulseFor(activeCalculatorId);
      calculatorRenderer(root, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        rejectedInputCount: feedbackPulse.rejectedInputCount,
        builderChangedCount: feedbackPulse.builderChangedCount,
        settingsChangedCount: feedbackPulse.settingsChangedCount,
        rollUpdatedCount: feedbackPulse.rollUpdatedCount,
        substepExecutedCount: feedbackPulse.substepExecutedCount,
        substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
        unlockCompletedCount: feedbackPulse.unlockCompletedCount,
      });
    }
  } else {
    const activeCalculatorId = resolveActiveCalculatorId(state);
    const feedbackPulse = feedbackPulseFor(activeCalculatorId);
    calculatorRenderer(root, state, dispatch, {
      inputBlocked: options.inputBlocked,
      executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
      rejectedInputCount: feedbackPulse.rejectedInputCount,
      builderChangedCount: feedbackPulse.builderChangedCount,
      settingsChangedCount: feedbackPulse.settingsChangedCount,
      rollUpdatedCount: feedbackPulse.rollUpdatedCount,
      substepExecutedCount: feedbackPulse.substepExecutedCount,
      substepExecutedToneFrequenciesHz: feedbackPulse.substepExecutedToneFrequenciesHz,
      unlockCompletedCount: feedbackPulse.unlockCompletedCount,
    });
  }
  renderStorageV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
  renderInputV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
};

