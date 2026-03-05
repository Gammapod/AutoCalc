import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const outputDir = resolve(root, "mobile_web");

const requirePath = (relativePath) => {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required path for mobile web assets: ${absolutePath}`);
    process.exit(1);
  }
  return absolutePath;
};

const rebuildOutputDir = () => {
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });
};

const copyIntoOutput = (relativePath) => {
  const source = requirePath(relativePath);
  const destination = resolve(outputDir, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
};

rebuildOutputDir();
copyIntoOutput("index.html");
copyIntoOutput("dist");
copyIntoOutput("node_modules/katex");
copyIntoOutput("node_modules/chart.js");

console.log(`MOBILE_WEB_ASSETS_READY ${outputDir}`);
