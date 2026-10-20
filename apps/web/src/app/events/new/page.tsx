import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { groups } from "@minyanmate/db/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { EventForm } from "./event-form";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "New event",
};

export const dynamic = "force-dynamic";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { group: groupSlug } = await searchParams;

  // When linked from a group, pre-fill that group's defaults. The event is
  // still standalone — persisting a group↔event link is deferred (see
  // features/28-create-group.md).
  const group = groupSlug
    ? (
        await db
          .select({
            id: groups.id,
            name: groups.name,
            defaultLocation: groups.defaultLocation,
          })
          .from(groups)
          .where(eq(groups.slug, groupSlug))
          .limit(1)
      )[0]
    : undefined;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center py-10">
        <EventForm
          groupId={group?.id}
          groupName={group?.name}
          defaultLocation={group?.defaultLocation ?? undefined}
        />
      </main>
    </div>
  );
}
