import { buttonRegistry } from "./buttonRegistry.js";
import {
  isBinaryOperatorKeyId,
  isUnaryOperatorId,
  KEY_ID,
  resolveKeyId,
  type BinaryOperatorKeyId,
  type UnaryOperatorKeyId,
} from "./keyPresentation.js";

export type ExecutionValueKind = "rational" | "expr" | "complex" | "nan";
export type PolicyStatus = "active" | "deferred";
export type OperatorExecutionPolicy = {
  operatorId: BinaryOperatorKeyId | UnaryOperatorKeyId;
  accepts: {
    totalKinds: ExecutionValueKind[];
  };
  rejectPolicy: {
    division_by_zero: "division_by_zero";
    nan_input: "nan_input";
    unsupported_symbolic: "unsupported_symbolic";
    unsupportedSymbolicOnSymbolicOperand: boolean;
  };
  exactness: {
    mode: "exact_first";
    resultKind: "rational_or_complex_or_expr";
  };
  status: PolicyStatus;
  complexMode: "rational_only" | "complex_arithmetic" | "deferred_complex_policy";
  deferredReason?: string;
};

const EXACT_FIRST = { mode: "exact_first" as const, resultKind: "rational_or_complex_or_expr" as const };
const DEFAULT_REJECT_POLICY = {
  division_by_zero: "division_by_zero" as const,
  nan_input: "nan_input" as const,
  unsupported_symbolic: "unsupported_symbolic" as const,
};
const ALL_NON_NAN: ExecutionValueKind[] = ["rational", "expr", "complex"];

const entry = (
  operatorId: BinaryOperatorKeyId | UnaryOperatorKeyId,
  options: {
    totalKinds: ExecutionValueKind[];
    complexMode: "rational_only" | "complex_arithmetic" | "deferred_complex_policy";
    status?: PolicyStatus;
    unsupportedSymbolicOnSymbolicOperand?: boolean;
    deferredReason?: string;
  },
): OperatorExecutionPolicy => ({
  operatorId,
  accepts: { totalKinds: options.totalKinds },
  rejectPolicy: {
    ...DEFAULT_REJECT_POLICY,
    unsupportedSymbolicOnSymbolicOperand: Boolean(options.unsupportedSymbolicOnSymbolicOperand),
  },
  exactness: EXACT_FIRST,
  status: options.status ?? "active",
  complexMode: options.complexMode,
  ...(options.deferredReason ? { deferredReason: options.deferredReason } : {}),
});

const POLICY_ENTRIES: OperatorExecutionPolicy[] = [
  entry(KEY_ID.op_add, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.op_sub, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.op_mul, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.op_div, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.op_pow, {
    totalKinds: ALL_NON_NAN,
    complexMode: "complex_arithmetic",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "non_integer_complex_exponent_policy_deferred",
  }),
  entry(KEY_ID.op_euclid_div, {
    totalKinds: ALL_NON_NAN,
    complexMode: "deferred_complex_policy",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "gaussian_divisor_policy_deferred",
  }),
  entry(KEY_ID.op_mod, {
    totalKinds: ALL_NON_NAN,
    complexMode: "deferred_complex_policy",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "gaussian_divisor_policy_deferred",
  }),
  entry(KEY_ID.op_rotate_left, {
    totalKinds: ALL_NON_NAN,
    complexMode: "deferred_complex_policy",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "complex_rotation_policy_deferred",
  }),
  entry(KEY_ID.op_rotate_15, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.op_gcd, {
    totalKinds: ALL_NON_NAN,
    complexMode: "deferred_complex_policy",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "non_gaussian_complex_norm_policy_deferred",
  }),
  entry(KEY_ID.op_lcm, {
    totalKinds: ALL_NON_NAN,
    complexMode: "deferred_complex_policy",
    status: "deferred",
    unsupportedSymbolicOnSymbolicOperand: true,
    deferredReason: "non_gaussian_complex_norm_policy_deferred",
  }),
  entry(KEY_ID.op_max, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.op_min, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_inc, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_dec, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_neg, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_sigma, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_phi, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_omega, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_not, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_collatz, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_sort_asc, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_floor, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_ceil, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_mirror_digits, { totalKinds: ALL_NON_NAN, complexMode: "deferred_complex_policy" }),
  entry(KEY_ID.unary_i, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
  entry(KEY_ID.unary_rotate_15, { totalKinds: ALL_NON_NAN, complexMode: "complex_arithmetic" }),
];

const OPERATOR_POLICY_MAP = new Map<
  BinaryOperatorKeyId | UnaryOperatorKeyId,
  OperatorExecutionPolicy
>(POLICY_ENTRIES.map((row) => [row.operatorId, row]));

export const operatorExecutionPolicies: readonly OperatorExecutionPolicy[] = POLICY_ENTRIES;

export const resolveOperatorExecutionPolicy = (
  operatorId: BinaryOperatorKeyId | UnaryOperatorKeyId,
): OperatorExecutionPolicy => {
  const policy = OPERATOR_POLICY_MAP.get(operatorId);
  if (!policy) {
    throw new Error(`Missing execution policy for operator: ${operatorId}`);
  }
  return policy;
};

const getExecutableOperatorIdsFromCatalog = (): Array<BinaryOperatorKeyId | UnaryOperatorKeyId> =>
  buttonRegistry
    .map((row) => resolveKeyId(row.key))
    .filter((keyId): keyId is BinaryOperatorKeyId | UnaryOperatorKeyId => (
      isBinaryOperatorKeyId(keyId) || isUnaryOperatorId(keyId)
    ));

export const validateOperatorExecutionPolicyRegistry = (): void => {
  const seen = new Set<BinaryOperatorKeyId | UnaryOperatorKeyId>();
  for (const row of POLICY_ENTRIES) {
    if (seen.has(row.operatorId)) {
      throw new Error(`Duplicate execution policy entry for operator: ${row.operatorId}`);
    }
    seen.add(row.operatorId);
  }

  const expected = new Set(getExecutableOperatorIdsFromCatalog());
  for (const operatorId of expected) {
    if (!OPERATOR_POLICY_MAP.has(operatorId)) {
      throw new Error(`Missing execution policy entry for executable operator: ${operatorId}`);
    }
  }

  for (const operatorId of OPERATOR_POLICY_MAP.keys()) {
    if (!expected.has(operatorId)) {
      throw new Error(`Unexpected execution policy entry for non-executable operator: ${operatorId}`);
    }
  }
};

validateOperatorExecutionPolicyRegistry();
