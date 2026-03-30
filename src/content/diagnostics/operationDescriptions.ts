import type { BinaryOperatorKeyId, UnaryOperatorKeyId } from "../../domain/keyPresentation.js";
import {
  getOperatorAlgebraicFace,
  getOperatorSlotFace,
  KEY_ID,
} from "../../domain/keyPresentation.js";
import type { OperationDiagnosticEntry } from "../../contracts/diagnostics.js";

const unaryOps: readonly UnaryOperatorKeyId[] = [
  KEY_ID.unary_inc,
  KEY_ID.unary_dec,
  KEY_ID.unary_neg,
  KEY_ID.unary_sigma,
  KEY_ID.unary_phi,
  KEY_ID.unary_omega,
  KEY_ID.unary_not,
  KEY_ID.unary_collatz,
  KEY_ID.unary_sort_asc,
  KEY_ID.unary_floor,
  KEY_ID.unary_ceil,
  KEY_ID.unary_mirror_digits,
  KEY_ID.unary_i,
];

const binaryOps: readonly BinaryOperatorKeyId[] = [
  KEY_ID.op_add,
  KEY_ID.op_sub,
  KEY_ID.op_mul,
  KEY_ID.op_pow,
  KEY_ID.op_div,
  KEY_ID.op_euclid_div,
  KEY_ID.op_mod,
  KEY_ID.op_rotate_left,
  KEY_ID.op_gcd,
  KEY_ID.op_lcm,
  KEY_ID.op_max,
  KEY_ID.op_min,
];

const buildUnaryEntry = (operatorId: UnaryOperatorKeyId): OperationDiagnosticEntry => ({
  label: getOperatorSlotFace(operatorId),
  expandedShortTemplate: "{operatorFace}({currentTotal})",
  expandedLongTemplate:
    "Unary operation {operatorFace} applies directly to the running value on {calcSymbol}. Current view: {operatorFace}({currentTotal}).",
});

const buildBinaryEntry = (operatorId: BinaryOperatorKeyId): OperationDiagnosticEntry => ({
  label: getOperatorSlotFace(operatorId),
  expandedShortTemplate: "{currentTotal} {operatorFace} {operand}",
  expandedLongTemplate:
    "Binary operation {operatorFace} combines the running value and operand. Expanded form: {currentTotal} {operatorFace} {operand}. Algebraic token: {operatorAlgebraicFace}.",
});

export const unaryOperationDiagnostics: Record<UnaryOperatorKeyId, OperationDiagnosticEntry> = Object.fromEntries(
  unaryOps.map((operatorId) => [operatorId, buildUnaryEntry(operatorId)]),
) as Record<UnaryOperatorKeyId, OperationDiagnosticEntry>;

export const binaryOperationDiagnostics: Record<BinaryOperatorKeyId, OperationDiagnosticEntry> = Object.fromEntries(
  binaryOps.map((operatorId) => [operatorId, buildBinaryEntry(operatorId)]),
) as Record<BinaryOperatorKeyId, OperationDiagnosticEntry>;

export const operationDiagnostics = {
  unary: unaryOperationDiagnostics,
  binary: binaryOperationDiagnostics,
};

export const resolveOperatorAlgebraicFace = (operatorId: BinaryOperatorKeyId | UnaryOperatorKeyId): string =>
  getOperatorAlgebraicFace(operatorId);

