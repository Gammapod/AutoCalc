import type { BinaryOperatorKeyId, KeyId, UnaryOperatorKeyId } from "../domain/keyPresentation.js";

export type KeyDiagnosticEntry = {
  title: string;
  shortTemplate: string;
  longTemplate?: string;
  caveats?: string[];
};

export type OperationDiagnosticEntry = {
  label: string;
  expandedShortTemplate: string;
  expandedLongTemplate: string;
  examples?: string[];
};

export type DiagnosticsCatalog = {
  keys: Record<KeyId, KeyDiagnosticEntry>;
  operations: {
    unary: Record<UnaryOperatorKeyId, OperationDiagnosticEntry>;
    binary: Record<BinaryOperatorKeyId, OperationDiagnosticEntry>;
  };
};

