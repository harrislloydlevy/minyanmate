import type { Metadata } from "next";
import { asc, eq, or } from "drizzle-orm";
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

  const myGroups = await db
    .selectDistinct({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(
      or(
        eq(groups.ownerId, session.user.id),
        eq(groupMembers.userId, session.user.id),
      ),
    )
    .orderBy(asc(groups.name));

  const upcomingEvents = await getUpcomingEventSummaries(
    session.user.id,
    today,
    { kind: "my", groupIds: myGroups.map((group) => group.id) },
  );

  const oneOffEvents = upcomingEvents.filter(
    (summary) =>
      !summary.event.groupId &&
      summary.event.status !== "cancelled" &&
      summary.userRsvp !== null,
  );

  const groupSections = myGroups.map((group) => ({
    ...group,
    events: upcomingEvents
      .filter(
        (summary) =>
          summary.event.groupId === group.id &&
          summary.event.status === "scheduled",
      )
      .slice(0, 3),
  }));

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
                {group.events.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {group.events.map((summary) => (
                      <EventCard key={summary.event.id} summary={summary} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No upcoming scheduled minyans.
                  </p>
                )}
              </section>
            ))}
          </div>
        )}

        {oneOffEvents.length === 0 && groupSections.length === 0 && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No upcoming minyans</CardTitle>
              <CardDescription>
                Create an event or join a group to get started.
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
