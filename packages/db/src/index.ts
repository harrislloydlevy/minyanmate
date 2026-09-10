import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export * from "./schema";

/** Walks up from `start` until it finds the pnpm workspace root. */
export function findWorkspaceRoot(start: string = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** DB_PATH is relative to the repo root so web + worker agree on the file. */
export function resolveDbPath(): string {
  const configured = process.env.DB_PATH ?? "data/dev.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(findWorkspaceRoot(), configured);
}

export interface DbHandle {
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: Database.Database;
}

function open(file: string): Database.Database {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

/** Opens (and creates) the on-disk SQLite database. */
export function createDb(filePath: string = resolveDbPath()): DbHandle {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const sqlite = open(filePath);
  return { db: drizzle(sqlite, { schema }), sqlite };
}

/** Fresh in-memory database for tests. Remember to run migrations on it. */
export function createMemoryDb(): DbHandle {
  const sqlite = open(":memory:");
  return { db: drizzle(sqlite, { schema }), sqlite };
}
