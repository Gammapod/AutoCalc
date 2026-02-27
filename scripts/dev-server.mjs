import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import { generateRuntimeDependencyMap } from "./generate-runtime-dependency-map.mjs";

const PORT = 4173;
const ROOT = process.cwd();

try {
  const generated = await generateRuntimeDependencyMap(ROOT);
  console.log(
    `GENERATED_MMD ${generated.outputPath} unlock_nodes=${generated.unlockCount} unlock_edges=${generated.edgeCount}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`GENERATED_MMD_FAILED ${message}`);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const safePath = (urlPath) => {
  const clean = (urlPath || "/").split("?")[0].split("#")[0];
  const normalized = normalize(clean).replace(/^([.][.][/\\])+/, "");
  const asFile = normalized === "/" ? "index.html" : normalized.replace(/^[/\\]/, "");
  return join(ROOT, asFile);
};

const server = createServer((req, res) => {
  const filePath = safePath(req.url);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
    return;
  }

  const mimeType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeType);
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`SERVER_READY http://localhost:${PORT}/index.html`);
});
