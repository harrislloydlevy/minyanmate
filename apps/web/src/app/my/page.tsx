import type { Metadata } from "next";
import { asc, eq, inArray, or } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, UsersRound } from "lucide-react";
import { groupMembers, groups } from "@minyanmate/db/schema";
import { SignOutButton } from "./sign-out-button";
import { EventCard } from "@/components/event-card";
import { GuestMerge } from "@/components/guest-merge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUpcomingEventSummaries } from "@/lib/event-summaries";

export const metadata: Metadata = {
  title: "My minyans",
};

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const rsvpEvents = await getUpcomingEventSummaries(
    session.user.id,
    today,
    { kind: "rsvp", userId: session.user.id },
  );

  // Cancelled events stay off My Minyans; they remain visible on the group page.
  const visibleEvents = rsvpEvents.filter(
    (summary) => summary.event.status !== "cancelled",
  );

  const oneOffEvents = visibleEvents.filter(
    (summary) => !summary.event.groupId,
  );

  const groupIds = [
    ...new Set(
      visibleEvents.flatMap((summary) =>
        summary.event.groupId ? [summary.event.groupId] : [],
      ),
    ),
  ];

  const rsvpGroups =
    groupIds.length > 0
      ? await db
          .select({
            id: groups.id,
            name: groups.name,
            slug: groups.slug,
          })
          .from(groups)
          .where(inArray(groups.id, groupIds))
          .orderBy(asc(groups.name))
      : [];

  const groupSections = rsvpGroups.map((group) => ({
    ...group,
    events: visibleEvents.filter(
      (summary) => summary.event.groupId === group.id,
    ),
  }));

  // Empty state only when the user has no groups and no upcoming RSVP'd events.
  const userGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(
      or(
        eq(groups.ownerId, session.user.id),
        eq(groupMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  const hasGroups = userGroups.length > 0;
  const hasEvents = visibleEvents.length > 0;
  const isEmpty = !hasGroups && !hasEvents;

  if (isEmpty) {
    return (
      <div className="flex min-h-svh flex-col">
        <GuestMerge />
        <header className="flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Minyan<span className="text-primary">Mate</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome{session.user.name ? `, ${session.user.name}` : ""}
            </h1>
            <p className="text-muted-foreground text-base">
              MinyanMate helps you organise minyans and keep track of who&apos;s
              coming.
            </p>
            <Button asChild size="lg">
              <Link href="/events/new">
                <CalendarPlus className="size-4" />
                Create your first minyan
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <GuestMerge />
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 space-y-8 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome{session.user.name ? `, ${session.user.name}` : ""}
            </h1>
            <p className="text-muted-foreground text-sm">
              Signed in as {session.user.phoneNumber ?? session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/groups/new">
                <UsersRound className="size-4" />
                New group
              </Link>
            </Button>
            <Button asChild>
              <Link href="/events/new">
                <CalendarPlus className="size-4" />
                New event
              </Link>
            </Button>
          </div>
        </div>

        {oneOffEvents.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Once-Off</h2>
            <div className="flex flex-col gap-3">
              {oneOffEvents.map((summary) => (
                <EventCard key={summary.event.id} summary={summary} />
              ))}
            </div>
          </section>
        )}

        {groupSections.length > 0 && (
          <div className="space-y-8">
            {groupSections.map((group) => (
              <section key={group.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/groups/${group.slug}`}>Details</Link>
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  {group.events.map((summary) => (
                    <EventCard key={summary.event.id} summary={summary} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {oneOffEvents.length === 0 && groupSections.length === 0 && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No RSVP&apos;d minyans yet</CardTitle>
              <CardDescription>
                RSVP to a minyan and it will show up here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild>
                <Link href="/events/new">
                  <CalendarPlus className="size-4" />
                  New event
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/groups/new">
                  <UsersRound className="size-4" />
                  New group
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
