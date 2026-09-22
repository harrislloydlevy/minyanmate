import { and, asc, eq, lte, sql } from "drizzle-orm";
import { createDb, jobs } from "@minyanmate/db";

/**
 * Minimal durable job worker.
 * Milestone 4 registers the real handlers (materialization, reminders,
 * quorum notifications); the claim/retry/lease machinery lives here.
 */

type JobHandler = (payload: Record<string, unknown>) => Promise<void> | void;

/**
 * Job type: `event_edited`
 *
 * Enqueued by the web `updateEvent` server action whenever an organiser
 * changes event details within the last hour. Payload contract:
 * `{ eventId: string; editedAt: string /* ISO-8601 *\/ }`.
 *
 * TODO(minyanmate#11): replace the log-only handler with a real fan-out that
 *   loads the confirmed RSVPs for `eventId` and sends each attendee a
 *   WhatsApp message (or template) describing the change. This requires the
 *   Meta WhatsApp credentials, which are not available in this environment,
 *   so the handler currently only records intent. The job row is still
 *   durable and will be retried/observed like any other job.
 */
function handleEventEdited(payload: Record<string, unknown>): void {
  const eventId = typeof payload.eventId === "string" ? payload.eventId : null;
  console.log(
    "[worker] event_edited: %s editedAt=%s (notification fan-out not yet implemented)",
    eventId ?? "<unknown>",
    payload.editedAt ?? "<unknown>",
  );
}

const handlers: Record<string, JobHandler> = {
  noop: () => {},
  event_edited: handleEventEdited,
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
