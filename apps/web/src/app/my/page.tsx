import type { Metadata } from "next";
import { asc, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { CalendarPlus, UsersRound } from "lucide-react";
import { groups } from "@minyanmate/db/schema";
import { SignOutButton } from "./sign-out-button";
import { ProfileForm } from "./profile-form";
import { BecomeRegular } from "@/components/become-regular";
import { EventCard } from "@/components/event-card";
import { EventRow } from "@/components/event-row";
import { GuestMerge } from "@/components/guest-merge";
import { SiteLogo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUpcomingEventSummaries } from "@/lib/event-summaries";
import { formatEventTime } from "@/lib/format-event";
import { getMemberGroupIds } from "@/lib/group-membership";

export const metadata: Metadata = {
  title: "My minyans",
};

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieStore = await cookies();
  const guestToken = session ? null : (cookieStore.get("guest_token")?.value ?? null);
  const guestName = session ? null : (cookieStore.get("guest_name")?.value ?? null);

  const today = new Date().toISOString().slice(0, 10);

  const myEvents = session
    ? await getUpcomingEventSummaries(session.user.id, today, {
        kind: "my",
        userId: session.user.id,
      })
    : guestToken
      ? await getUpcomingEventSummaries(null, today, {
          kind: "guest",
          guestToken,
        })
      : [];

  // Cancelled events stay off My Minyans; they remain visible on the group page.
  // The feed is intentionally short: the next three minyans only.
  const visibleEvents = myEvents
    .filter((summary) => summary.event.status !== "cancelled")
    .slice(0, 3);

  const oneOffEvents = visibleEvents.filter((summary) => !summary.event.groupId);

  // Preserve the chronological order of the feed when grouping by group.
  const groupIds = [
    ...new Set(
      visibleEvents.flatMap((summary) => (summary.event.groupId ? [summary.event.groupId] : [])),
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

  const groupsById = new Map(rsvpGroups.map((group) => [group.id, group]));

  const memberGroupIds = session
    ? await getMemberGroupIds(db, session.user.id, groupIds)
    : new Set<string>();

  const groupSections = groupIds.flatMap((groupId) => {
    const group = groupsById.get(groupId);
    if (!group) return [];
    const events = visibleEvents.filter((summary) => summary.event.groupId === groupId);
    // Recurring instances share a time and place; show them once in the heading.
    const recurring = events.find((summary) => summary.event.minyanId !== null);
    const scheduleLine = recurring
      ? `${formatEventTime(recurring.event.startsAt)} · ${
          recurring.event.locationText ?? "No location set"
        }`
      : null;
    return [{ ...group, events, scheduleLine, isMember: memberGroupIds.has(group.id) }];
  });

  return (
    <div className="flex min-h-svh flex-col">
      {session && <GuestMerge />}
      <header className="flex h-16 items-center justify-between">
        <SiteLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <SignOutButton />
          ) : (
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {session ? (
              <ProfileForm
                initialName={session.user.name ?? ""}
                phoneNumber={session.user.phoneNumber ?? null}
              />
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome{guestName ? `, ${guestName}` : ""}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {guestToken
                    ? "Showing RSVPs saved on this device."
                    : "No RSVPs saved on this device yet."}
                </p>
              </>
            )}
          </div>
          {session && (
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
          )}
        </div>

        {oneOffEvents.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Once-Off</h2>
            <div className="flex flex-col gap-3">
              {oneOffEvents.map((summary) => (
                <EventCard key={summary.event.id} summary={summary} showQuickRsvp={!!session} />
              ))}
            </div>
          </section>
        )}

        {groupSections.length > 0 && (
          <div className="space-y-4">
            {groupSections.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        {group.isMember ? (
                          <span className="text-muted-foreground text-xs">(Member)</span>
                        ) : session ? (
                          <BecomeRegular slug={group.slug} />
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/login?joinGroup=${group.slug}`}>Become Regular</Link>
                          </Button>
                        )}
                      </div>
                      {group.scheduleLine && (
                        <CardDescription className="text-xs">{group.scheduleLine}</CardDescription>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/groups/${group.slug}`}>Details</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y">
                    {group.events.map((summary) => (
                      <EventRow
                        key={summary.event.id}
                        summary={summary}
                        showQuickRsvp={!!session}
                        compact={summary.event.minyanId !== null}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {oneOffEvents.length === 0 && groupSections.length === 0 && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No upcoming minyans yet</CardTitle>
              <CardDescription>
                Join a group or RSVP to a minyan and it will show up here.
              </CardDescription>
            </CardHeader>
            {session && (
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
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
