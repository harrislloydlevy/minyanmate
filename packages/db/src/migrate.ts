import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./index";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(here, "..", "drizzle");

const { db, sqlite } = createDb();

try {
  migrate(db, { migrationsFolder });
  console.log("[db] migrations applied");
} finally {
  sqlite.close();
}
