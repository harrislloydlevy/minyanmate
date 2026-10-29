import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { CalendarPlus, Clock, MapPin, StickyNote, UsersRound } from "lucide-react";
import { events, groupMembers, groups, guests, minyans, rsvps, users } from "@minyanmate/db/schema";
import { parseWeeklySchedule } from "@minyanmate/core";
import { EventRow } from "@/components/event-row";
import { GroupRecurrenceForm } from "@/components/group-recurrence-form";
import { JoinGroup } from "@/components/join-group";
import { JoinLink } from "@/components/join-link";
import { LeaveGroup } from "@/components/leave-group";
import { MemberActions } from "@/components/member-actions";
import { SiteLogo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUpcomingEventSummaries } from "@/lib/event-summaries";

export const metadata: Metadata = {
  title: "Group details",
};

export const dynamic = "force-dynamic";

type MemberRow = {
  userId: string;
  role: "organiser" | "member";
  name: string;
  isOwner: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatSchedule(schedule: { weekdays: number[]; time: string }): string {
  const days =
    schedule.weekdays.length === 7
      ? "Daily"
      : schedule.weekdays.map((day) => WEEKDAY_LABELS[day] ?? day).join(", ");
  return `${days} at ${formatTime(schedule.time)}`;
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = !!session;

  const { slug } = await params;
  const { join: joinTokenParam } = await searchParams;

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      defaultLocation: groups.defaultLocation,
      description: groups.description,
      ownerId: groups.ownerId,
      joinToken: groups.joinToken,
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center justify-between">
          <SiteLogo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-start justify-center py-10">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Group not found</CardTitle>
              <CardDescription>This group may have been deleted or never existed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/my">Back to my minyans</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, group.ownerId))
    .limit(1);

  const memberRows = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      name: users.name,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, group.id));

  const memberById = new Map<string, MemberRow>(
    memberRows.map((m) => [
      m.userId,
      {
        userId: m.userId,
        role: m.role,
        name: m.name,
        isOwner: m.userId === group.ownerId,
      },
    ]),
  );
  // The owner is always an organiser, even on groups created before memberships existed.
  if (!memberById.has(group.ownerId)) {
    memberById.set(group.ownerId, {
      userId: group.ownerId,
      role: "organiser",
      name: owner?.name || "Unknown",
      isOwner: true,
    });
  }
  const members: MemberRow[] = Array.from(memberById.values()).sort(
    (a, b) => Number(b.isOwner) - Number(a.isOwner),
  );

  const isOwner = isAuthenticated && group.ownerId === session.user.id;
  const viewerMember = isAuthenticated ? memberById.get(session.user.id) : undefined;
  const isMember = isOwner || !!viewerMember;
  const canManage = isOwner || viewerMember?.role === "organiser";

  const [minyan] = await db
    .select({
      id: minyans.id,
      schedule: minyans.schedule,
      locationText: minyans.locationText,
    })
    .from(minyans)
    .where(eq(minyans.groupId, group.id))
    .limit(1);
  const schedule = minyan ? parseWeeklySchedule(minyan.schedule) : null;

  // Guests who RSVP'd to one of this group's events (or signed-in users with
  // an RSVP but no membership row) can join without an invite link.
  let hasGroupEventRsvp = false;
  if (!isMember && session) {
    const [rsvp] = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .innerJoin(events, eq(rsvps.eventId, events.id))
      .where(and(eq(rsvps.userId, session.user.id), eq(events.groupId, group.id)))
      .limit(1);
    hasGroupEventRsvp = !!rsvp;
  } else if (!isMember) {
    const guestToken = (await cookies()).get("guest_token")?.value;
    if (guestToken) {
      const [guestRsvp] = await db
        .select({ id: guests.id })
        .from(guests)
        .innerJoin(events, eq(guests.eventId, events.id))
        .where(and(eq(guests.token, guestToken), eq(events.groupId, group.id)))
        .limit(1);
      hasGroupEventRsvp = !!guestRsvp;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = await getUpcomingEventSummaries(session?.user.id ?? null, today, {
    kind: "group",
    groupId: group.id,
  });

  const joinDismissed = joinTokenParam === "dismiss";
  const inviteAccepted =
    !!joinTokenParam && !!group.joinToken && joinTokenParam === group.joinToken;
  const showJoin = !isMember && !joinDismissed && (inviteAccepted || hasGroupEventRsvp);
  const invalidInvite =
    !isMember && !joinDismissed && !!joinTokenParam && !inviteAccepted && !hasGroupEventRsvp;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between">
        <SiteLogo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-xl">{group.name}</CardTitle>
              </div>
              {isOwner && <span className="text-muted-foreground text-xs">You own this group</span>}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <UsersRound className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Organiser</dt>
                  <dd>{owner?.name || "Unknown"}</dd>
                </div>
              </div>

              {group.defaultLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Default location</dt>
                    <dd>{group.defaultLocation}</dd>
                  </div>
                </div>
              )}

              {group.description && (
                <div className="flex items-start gap-3">
                  <StickyNote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Description</dt>
                    <dd>{group.description}</dd>
                  </div>
                </div>
              )}

              {schedule && (
                <div className="flex items-start gap-3">
                  <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Recurring schedule</dt>
                    <dd>{formatSchedule(schedule)}</dd>
                    {minyan?.locationText && (
                      <dd className="text-muted-foreground text-xs">{minyan.locationText}</dd>
                    )}
                  </div>
                </div>
              )}
            </dl>

            {canManage && !minyan && (
              <div className="border-t pt-4 flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Recurring schedule</h3>
                  <p className="text-muted-foreground text-xs">
                    This group was created before schedules were part of groups. Set one to generate
                    future minyans automatically.
                  </p>
                </div>
                <GroupRecurrenceForm slug={group.slug} />
              </div>
            )}

            {showJoin && (
              <JoinGroup
                slug={group.slug}
                name={group.name}
                token={joinTokenParam}
                signedIn={isAuthenticated}
                fromRsvp={hasGroupEventRsvp}
              />
            )}
            {invalidInvite && (
              <p className="text-destructive text-sm">This invite link is not valid.</p>
            )}

            <div className="border-t pt-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Upcoming minyans</h3>
              {upcomingEvents.length > 0 ? (
                <ul className="divide-y">
                  {upcomingEvents.map((summary) => (
                    <EventRow
                      key={summary.event.id}
                      summary={summary}
                      showQuickRsvp={isAuthenticated}
                      compact={summary.event.minyanId !== null}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming minyans.</p>
              )}
            </div>

            {canManage && (
              <div className="border-t pt-4 flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Invite link</h3>
                <p className="text-muted-foreground text-xs">
                  Share this link so people can join as members.
                </p>
                <JoinLink slug={group.slug} initialToken={group.joinToken} />
              </div>
            )}

            <div className="border-t pt-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Members</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-2">
                    <span>{m.name || "Unknown"}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          m.role === "organiser"
                            ? "bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs"
                            : "text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                        }
                      >
                        {m.role === "organiser" ? "Organiser" : "Member"}
                      </span>
                      {canManage && !m.isOwner && (
                        <MemberActions groupId={group.id} userId={m.userId} role={m.role} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {canManage && (
              <Button asChild className="w-full">
                <Link href={`/events/new?group=${group.slug}`}>
                  <CalendarPlus className="size-4" />
                  New event for this group
                </Link>
              </Button>
            )}

            {isMember && !isOwner && (
              <div className="border-t pt-4">
                <LeaveGroup
                  slug={group.slug}
                  name={group.name}
                  isSoleOrganiser={
                    !!viewerMember &&
                    viewerMember.role === "organiser" &&
                    members.filter((m) => m.role === "organiser").length === 1
                  }
                  candidates={members
                    .filter((m) => m.userId !== session?.user.id && m.role === "member")
                    .map((m) => ({ userId: m.userId, name: m.name }))}
                />
              </div>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link href="/my">Back to my minyans</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
