import { rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
rmSync(distDir, { recursive: true, force: true });
console.log(`DIST_CLEANED ${distDir}`);
