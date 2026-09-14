import { and, asc, eq, lte, sql } from "drizzle-orm";
import { createDb, jobs } from "@minyanmate/db";

/**
 * Minimal durable job worker.
 * Milestone 4 registers the real handlers (materialization, reminders,
 * quorum notifications); the claim/retry/lease machinery lives here.
 */

type JobHandler = (payload: Record<string, unknown>) => Promise<void> | void;

const handlers: Record<string, JobHandler> = {
  noop: () => {},
};

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 10;
const RETRY_BACKOFF_MS = 30_000;

function backoff(attempts: number): Date {
  return new Date(Date.now() + Math.min(RETRY_BACKOFF_MS * 2 ** attempts, 15 * 60_000));
}

async function claimDue(): Promise<string[]> {
  const { db, sqlite } = getHandle();
  const due = db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), lte(jobs.runAt, sql`(unixepoch())`)))
    .orderBy(asc(jobs.runAt))
    .limit(BATCH_SIZE);

  const ids = sqlite.transaction(() => {
    const rows = due.all();
    for (const row of rows) {
      db.update(jobs)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(jobs.id, row.id))
        .run();
    }
    return rows.map((row) => row.id);
  })();

  return ids;
}

async function runJob(id: string): Promise<void> {
  const { db } = getHandle();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return;

  try {
    const handler = handlers[job.type];
    if (!handler) throw new Error(`no handler registered for job type "${job.type}"`);
    await handler(JSON.parse(job.payload) as Record<string, unknown>);
    await db
      .update(jobs)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(jobs.id, id));
  } catch (error) {
    const attempts = job.attempts + 1;
    const failed = attempts >= job.maxAttempts;
    await db
      .update(jobs)
      .set({
        status: failed ? "failed" : "pending",
        attempts,
        lastError: error instanceof Error ? error.message : String(error),
        runAt: failed ? job.runAt : backoff(attempts),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id));
  }
}

let handle: ReturnType<typeof createDb> | undefined;
function getHandle() {
  handle ??= createDb();
  return handle;
}

let running = true;
let timer: NodeJS.Timeout | undefined;

async function tick(): Promise<void> {
  try {
    const ids = await claimDue();
    for (const id of ids) await runJob(id);
  } catch (error) {
    console.error("[worker] tick failed:", error);
  }
}

function start(): void {
  const { db } = getHandle();
  console.log("[worker] started, polling every %dms", POLL_INTERVAL_MS);

  timer = setInterval(() => {
    if (!running) return;
    void tick();
  }, POLL_INTERVAL_MS);

  const stop = (): void => {
    if (!running) return;
    running = false;
    clearInterval(timer);
    console.log("[worker] shutting down");
    db.$client.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

start();
