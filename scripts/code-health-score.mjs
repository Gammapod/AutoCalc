import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SCORE_WEIGHTS = {
  build: 15,
  tests: 25,
  boundaries: 15,
  uiComplexity: 10,
  testDensity: 10,
  typeDiscipline: 10,
  docs: 10,
  debt: 5,
};

const REQUIRED_DOCS = [
  "README.md",
  "docs/functional-spec.md",
  "docs/release-windows.md",
  "docs/release-android.md",
];

const ENFORCEMENT = {
  none: 0,
  "hackathon": 60,
  "good-enough": 80,
  perfection: 95,
};

const args = process.argv.slice(2);
const enforceArg = args.find((arg) => arg.startsWith("--enforce="));
const enforceTierRaw = enforceArg ? enforceArg.slice("--enforce=".length).trim() : "";
const isCi = process.env.CI === "true";
const enforceTier = (enforceTierRaw || (isCi ? "good-enough" : "none")).toLowerCase();

if (!(enforceTier in ENFORCEMENT)) {
  console.error(`Unknown enforce tier '${enforceTier}'. Use one of: ${Object.keys(ENFORCEMENT).join(", ")}`);
  process.exit(2);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;

const runCommand = (label, command) => {
  console.log(`\n--- ${label} ---`);
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    console.error(result.error);
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

const walkFiles = async (dir, predicate) => {
  let matches = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      matches += await walkFiles(fullPath, predicate);
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) {
      matches += 1;
    }
  }
  return matches;
};

const countPatternMatches = async (dir, predicate, regex) => {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countPatternMatches(fullPath, predicate, regex);
      continue;
    }
    if (!entry.isFile() || !predicate(fullPath)) {
      continue;
    }
    const contents = await readFile(fullPath, "utf8");
    const matches = contents.match(regex);
    count += matches ? matches.length : 0;
  }
  return count;
};

const sourcePredicate = (filePath) => filePath.endsWith(".ts") && !filePath.endsWith(".d.ts");
const testPredicate = (filePath) => filePath.endsWith(".test.ts");

const build = runCommand("Build", "npm run build:web");
const boundaries = runCommand("Dependency boundaries", "npm run ci:verify:boundaries");
const uiComplexity = runCommand("UI complexity", "npm run ci:verify:ui-complexity");

let tests = { status: 1, stdout: "", stderr: "Skipped because build failed." };
if (build.status === 0) {
  tests = runCommand("Tests", "node ./dist/tests/run-tests.js");
} else {
  console.error("\n--- Tests ---");
  console.error("Skipped tests because build failed.");
}

let sourceFiles = 0;
let testFiles = 0;
let tsNoCheckCount = 0;
let debtTagCount = 0;
try {
  sourceFiles = await walkFiles(resolve(process.cwd(), "src"), sourcePredicate);
  testFiles = await walkFiles(resolve(process.cwd(), "tests"), testPredicate);
  tsNoCheckCount = await countPatternMatches(
    resolve(process.cwd(), "src"),
    sourcePredicate,
    /@ts-nocheck/gi,
  );
  debtTagCount = await countPatternMatches(
    resolve(process.cwd(), "src"),
    sourcePredicate,
    /\b(TODO|FIXME|HACK)\b/gi,
  );
} catch (error) {
  console.error(error);
}

const passCount = (tests.stdout.match(/^PASS /gm) ?? []).length;
const failCount = (tests.stderr.match(/^FAIL /gm) ?? []).length + (tests.stdout.match(/^FAIL /gm) ?? []).length;
const totalTestGroups = passCount + failCount;
const testPassRate = totalTestGroups > 0 ? passCount / totalTestGroups : 0;
const testDensityRatio = sourceFiles > 0 ? testFiles / sourceFiles : 0;

const docStatuses = await Promise.all(
  REQUIRED_DOCS.map(async (docPath) => {
    try {
      const fileStats = await stat(resolve(process.cwd(), docPath));
      return { path: docPath, exists: fileStats.isFile() };
    } catch {
      return { path: docPath, exists: false };
    }
  }),
);
const docsPresent = docStatuses.filter((doc) => doc.exists).length;

const scores = {
  build: build.status === 0 ? SCORE_WEIGHTS.build : 0,
  tests: SCORE_WEIGHTS.tests * testPassRate,
  boundaries: boundaries.status === 0 ? SCORE_WEIGHTS.boundaries : 0,
  uiComplexity: uiComplexity.status === 0 ? SCORE_WEIGHTS.uiComplexity : 0,
  testDensity: SCORE_WEIGHTS.testDensity * clamp(testDensityRatio / 0.55, 0, 1),
  typeDiscipline: clamp(SCORE_WEIGHTS.typeDiscipline - tsNoCheckCount * 2, 0, SCORE_WEIGHTS.typeDiscipline),
  docs: SCORE_WEIGHTS.docs * (docsPresent / REQUIRED_DOCS.length),
  debt: SCORE_WEIGHTS.debt * clamp(1 - debtTagCount / 40, 0, 1),
};

const score = round2(Object.values(scores).reduce((total, value) => total + value, 0));
const hardGatesPass =
  build.status === 0 &&
  boundaries.status === 0 &&
  uiComplexity.status === 0 &&
  tests.status === 0 &&
  failCount === 0;

let standard = "below-hackathon";
if (score >= ENFORCEMENT.perfection && hardGatesPass && tsNoCheckCount === 0) {
  standard = "perfection";
} else if (score >= ENFORCEMENT["good-enough"] && hardGatesPass) {
  standard = "good-enough";
} else if (score >= ENFORCEMENT.hackathon) {
  standard = "hackathon";
}

const report = {
  timestamp: new Date().toISOString(),
  score,
  standard,
  enforceTier,
  hardGatesPass,
  checks: {
    buildPassed: build.status === 0,
    boundariesPassed: boundaries.status === 0,
    uiComplexityPassed: uiComplexity.status === 0,
    testsPassed: tests.status === 0 && failCount === 0,
    testGroups: {
      passed: passCount,
      failed: failCount,
      total: totalTestGroups,
      passRate: round2(testPassRate),
    },
    testDensity: {
      sourceFiles,
      testFiles,
      ratio: round2(testDensityRatio),
    },
    typeDiscipline: {
      tsNoCheckCount,
    },
    debt: {
      debtTagCount,
    },
    docs: docStatuses,
  },
  weightedScores: Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, round2(value)]),
  ),
};

await mkdir(resolve(process.cwd(), "dist/reports"), { recursive: true });
await writeFile(
  resolve(process.cwd(), "dist/reports/code-health-score.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log("\n=== Code Health Scorecard ===");
console.log(`Score: ${score}/100`);
console.log(`Standard: ${standard}`);
console.log(`Hard gates passed: ${hardGatesPass ? "yes" : "no"}`);
console.log(`Enforcement tier: ${enforceTier}`);
console.log("Weighted metrics:");
console.log(`- Build success: ${round2(scores.build)}/${SCORE_WEIGHTS.build}`);
console.log(`- Test pass rate: ${round2(scores.tests)}/${SCORE_WEIGHTS.tests} (${passCount}/${totalTestGroups})`);
console.log(`- Dependency boundaries: ${round2(scores.boundaries)}/${SCORE_WEIGHTS.boundaries}`);
console.log(`- UI complexity gate: ${round2(scores.uiComplexity)}/${SCORE_WEIGHTS.uiComplexity}`);
console.log(`- Test density proxy: ${round2(scores.testDensity)}/${SCORE_WEIGHTS.testDensity} (${testFiles}/${sourceFiles})`);
console.log(`- Type discipline (@ts-nocheck): ${round2(scores.typeDiscipline)}/${SCORE_WEIGHTS.typeDiscipline}`);
console.log(`- Documentation coverage: ${round2(scores.docs)}/${SCORE_WEIGHTS.docs} (${docsPresent}/${REQUIRED_DOCS.length})`);
console.log(`- Debt marker density: ${round2(scores.debt)}/${SCORE_WEIGHTS.debt} (${debtTagCount} tags)`);
console.log("Report: dist/reports/code-health-score.json");

const threshold = ENFORCEMENT[enforceTier];
const enforcePassed =
  enforceTier === "none" ||
  (
    score >= threshold &&
    (enforceTier === "hackathon" || hardGatesPass) &&
    (enforceTier !== "perfection" || tsNoCheckCount === 0)
  );

if (!enforcePassed) {
  console.error(
    `Code health gate failed: expected ${enforceTier} (>=${threshold}) but got ${score} (${standard}).`,
  );
  process.exit(1);
}

