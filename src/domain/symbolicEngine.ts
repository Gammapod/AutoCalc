const compact = (value: string): string => value.replace(/\s+/g, "");

export const normalizeSymbolicText = (expressionText: string): string => {
  return compact(expressionText);
};

export const symbolicEquals = (leftExpressionText: string, rightExpressionText: string): boolean =>
  normalizeSymbolicText(leftExpressionText) === normalizeSymbolicText(rightExpressionText);
