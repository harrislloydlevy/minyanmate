import { createDb } from "@minyanmate/db";

const globalStore = globalThis as unknown as {
  __minyanmateDb?: ReturnType<typeof createDb>;
};

/** Process-wide SQLite handle (survives Next.js HMR). */
export const dbHandle = (globalStore.__minyanmateDb ??= createDb());

export const db = dbHandle.db;
