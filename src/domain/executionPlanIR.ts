import type {
  BinarySlotOperator,
  CalculatorValue,
  ExpressionValue,
  GameState,
  Slot,
  UnarySlotOperator,
} from "./types.js";
import type { OperatorExecutionPolicy } from "./operatorExecutionPolicy.js";
import { resolveOperatorExecutionPolicy } from "./operatorExecutionPolicy.js";

export type WrapStageMode = "delta_range_clamp" | "mod_zero_to_delta" | "binary_octave_cycle";

export type ExecutionPlanStage =
  | { kind: "slot"; slot: Slot }
  | { kind: "wrap"; mode: WrapStageMode };

export type ExecutionOperandIR =
  | {
      kind: "digit";
      value: bigint;
    }
  | {
      kind: "symbolic_operand";
      value: ExpressionValue;
    };

export type ExecutionStepPolicyIR = {
  status: OperatorExecutionPolicy["status"];
  exactness: OperatorExecutionPolicy["exactness"]["mode"];
  deferred: boolean;
  deferredReason?: string;
};

export type ExecutionStepIR =
  | {
      kind: "unary";
      operatorId: UnarySlotOperator;
      policy: ExecutionStepPolicyIR;
    }
  | {
      kind: "binary";
      operatorId: BinarySlotOperator;
      operand: ExecutionOperandIR;
      policy: ExecutionStepPolicyIR;
    };

export type ExecutionPlanIR = {
  seed: CalculatorValue;
  steps: ExecutionStepIR[];
  metadata: {
    source: "slots" | "stages";
    wrapStageMode: WrapStageMode | null;
    terminalMode: "direct" | "wrap_tail";
  };
};

export type ExecutionPlanBuildResult = {
  plan: ExecutionPlanIR;
  wrapStageMode: WrapStageMode | null;
  hasWrapTail: boolean;
};

export const resolveExecutionPlanIRWrapStageMode = (state: Pick<GameState, "settings">): WrapStageMode | null => {
  if (state.settings.wrapper === "binary_octave_cycle") {
    return "binary_octave_cycle";
  }
  if (state.settings.wrapper === "mod_zero_to_delta") {
    return "mod_zero_to_delta";
  }
  if (state.settings.wrapper === "delta_range_clamp") {
    return "delta_range_clamp";
  }
  return null;
};

const toPolicyMetadata = (operatorId: BinarySlotOperator | UnarySlotOperator): ExecutionStepPolicyIR => {
  const policy = resolveOperatorExecutionPolicy(operatorId);
  return {
    status: policy.status,
    exactness: policy.exactness.mode,
    deferred: policy.status === "deferred",
    ...(policy.deferredReason ? { deferredReason: policy.deferredReason } : {}),
  };
};

const toStepIR = (slot: Slot): ExecutionStepIR => {
  if (slot.kind === "unary") {
    return {
      kind: "unary",
      operatorId: slot.operator,
      policy: toPolicyMetadata(slot.operator),
    };
  }
  return {
    kind: "binary",
    operatorId: slot.operator,
    operand: typeof slot.operand === "bigint"
      ? { kind: "digit", value: slot.operand }
      : { kind: "symbolic_operand", value: slot.operand },
    policy: toPolicyMetadata(slot.operator),
  };
};

const toSlotFromStep = (step: ExecutionStepIR): Slot => {
  if (step.kind === "unary") {
    return {
      kind: "unary",
      operator: step.operatorId,
    };
  }
  return {
    kind: "binary",
    operator: step.operatorId,
    operand: step.operand.kind === "digit" ? step.operand.value : step.operand.value,
  };
};

export const materializeSlotsFromExecutionPlanIR = (plan: ExecutionPlanIR): Slot[] =>
  plan.steps.map((step) => toSlotFromStep(step));

export const getExecutionPlanIRStageCount = (plan: ExecutionPlanIR): number =>
  plan.steps.length + (plan.metadata.wrapStageMode ? 1 : 0);

export const getExecutionPlanIRStageAt = (
  plan: ExecutionPlanIR,
  index: number,
): ExecutionPlanStage | null => {
  if (index < 0) {
    return null;
  }
  if (index < plan.steps.length) {
    return {
      kind: "slot",
      slot: toSlotFromStep(plan.steps[index]!),
    };
  }
  if (index === plan.steps.length && plan.metadata.wrapStageMode) {
    return {
      kind: "wrap",
      mode: plan.metadata.wrapStageMode,
    };
  }
  return null;
};

export const buildExecutionPlanIR = (
  seed: CalculatorValue,
  slots: Slot[],
  options: { wrapStageMode?: WrapStageMode | null } = {},
): ExecutionPlanBuildResult => {
  const wrapStageMode = options.wrapStageMode ?? null;
  const plan: ExecutionPlanIR = {
    seed,
    steps: slots.map(toStepIR),
    metadata: {
      source: "slots",
      wrapStageMode,
      terminalMode: wrapStageMode ? "wrap_tail" : "direct",
    },
  };
  return {
    plan,
    wrapStageMode,
    hasWrapTail: Boolean(wrapStageMode),
  };
};

export const buildExecutionPlanIRForState = (
  seed: CalculatorValue,
  slots: Slot[],
  state: Pick<GameState, "settings">,
): ExecutionPlanBuildResult =>
  buildExecutionPlanIR(seed, slots, { wrapStageMode: resolveExecutionPlanIRWrapStageMode(state) });

export const buildExecutionPlanIRFromStages = (
  seed: CalculatorValue,
  stages: ExecutionPlanStage[],
): ExecutionPlanBuildResult => {
  const maybeWrapStage = stages.at(-1);
  const wrapStageMode: WrapStageMode | null =
    maybeWrapStage && maybeWrapStage.kind === "wrap" ? maybeWrapStage.mode : null;
  const slots = stages
    .filter((stage): stage is Extract<ExecutionPlanStage, { kind: "slot" }> => stage.kind === "slot")
    .map((stage) => stage.slot);
  const fromSlots = buildExecutionPlanIR(seed, slots, { wrapStageMode });
  return {
    ...fromSlots,
    plan: {
      ...fromSlots.plan,
      metadata: {
        ...fromSlots.plan.metadata,
        source: "stages",
      },
    },
  };
};
