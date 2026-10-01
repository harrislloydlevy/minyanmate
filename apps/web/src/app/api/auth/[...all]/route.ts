import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return await auth.handler(request);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth:GET]", msg);
    return new Response(msg, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await auth.handler(request);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth:POST]", msg);
    return new Response(msg, { status: 500 });
  }
}
