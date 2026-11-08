import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "./index";
import { seedQuorumTestData } from "./seed-quorum-data";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(here, "..", "drizzle");

const { db, sqlite } = createDb();

async function main() {
  migrate(db, { migrationsFolder });
  console.log("[seed-quorum] migrations applied");
  await seedQuorumTestData(sqlite, db);
  console.log("\n[seed-quorum] Done.");
  console.log("   Log in with phone +100..+107 (Test User) or existing users.");
  console.log("   Group slug: quorum-test  (owner = first user)");
}

main()
  .catch(console.error)
  .finally(() => sqlite.close());
