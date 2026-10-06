import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sql`users`);
    const userCount = result?.count ?? 0;

    return Response.json({
      ok: true,
      status: "healthy",
      userCount,
      timestamp: new Date().toISOString(),
      stack: {
        web: "ok",
        database: "ok",
      },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        status: "degraded",
        error: "Database unreachable",
        timestamp: new Date().toISOString(),
        stack: {
          web: "ok",
          database: "error",
        },
      },
      { status: 503 },
    );
  }
}
