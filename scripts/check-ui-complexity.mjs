import { readFileSync } from "node:fs";
import ts from "typescript";

const LIMITS = {
  maxBranchPoints: 12,
  maxFunctionLines: 80,
};
const EXEMPT_MODULE_ENTRYPOINTS = new Set([
  "createShellRenderer",
  "renderCalculatorV2Module",
]);

const DEFAULT_TARGET_FILES = [
  "src/ui/shellRender.ts",
  "src/ui/modules/calculator/render.ts",
];
const filesArg = process.argv.find((arg) => arg.startsWith("--files="));
const TARGET_FILES = filesArg ? filesArg.slice("--files=".length).split(",").filter(Boolean) : DEFAULT_TARGET_FILES;

const countBranchPoints = (node) => {
  let count = 0;
  const stack = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }
    if (
      ts.isIfStatement(current) ||
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isDoStatement(current) ||
      ts.isCaseClause(current) ||
      ts.isConditionalExpression(current)
    ) {
      count += 1;
    }
    if (
      ts.isBinaryExpression(current) &&
      (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        current.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      count += 1;
    }
    ts.forEachChild(current, (child) => stack.push(child));
  }
  return count;
};

const getFunctionName = (node, source) => {
  if (ts.isFunctionDeclaration(node) && node.name?.text) {
    return node.name.text;
  }
  if (ts.isVariableStatement(node)) {
    const first = node.declarationList.declarations[0];
    if (first && ts.isIdentifier(first.name)) {
      return first.name.text;
    }
  }
  const snippet = source.slice(node.getStart(), Math.min(node.getStart() + 48, node.getEnd()));
  return snippet.replace(/\s+/g, " ").trim();
};

const collectModuleScopedFunctions = (sourceFile) =>
  sourceFile.statements.filter((node) =>
    ts.isFunctionDeclaration(node) ||
    (ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((decl) =>
        Boolean(decl.initializer) && (ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer)))));

const violations = [];
for (const file of TARGET_FILES) {
  const raw = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const functions = collectModuleScopedFunctions(sourceFile);
  for (const fnNode of functions) {
    const fn =
      ts.isVariableStatement(fnNode)
        ? fnNode.declarationList.declarations[0]?.initializer
        : fnNode;
    if (!fn) {
      continue;
    }
    const start = sourceFile.getLineAndCharacterOfPosition(fn.getStart()).line;
    const end = sourceFile.getLineAndCharacterOfPosition(fn.getEnd()).line;
    const functionLines = end - start + 1;
    const branchPoints = countBranchPoints(fn);
    const name = getFunctionName(fnNode, raw);
    if (EXEMPT_MODULE_ENTRYPOINTS.has(name)) {
      continue;
    }
    if (functionLines > LIMITS.maxFunctionLines) {
      violations.push(`${file}: ${name} has ${functionLines} lines (limit ${LIMITS.maxFunctionLines})`);
    }
    if (branchPoints > LIMITS.maxBranchPoints) {
      violations.push(`${file}: ${name} has ${branchPoints} branch points (limit ${LIMITS.maxBranchPoints})`);
    }
  }
}

if (violations.length > 0) {
  console.error("UI complexity checks failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("UI complexity checks passed.");
