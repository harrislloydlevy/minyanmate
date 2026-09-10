import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

/** Resolves DB_PATH relative to the repo root (where pnpm-workspace.yaml lives). */
function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const dbPath = process.env.DB_PATH ?? "data/dev.db";
const url = dbPath.startsWith("/") ? dbPath : `${repoRoot()}/${dbPath}`;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
