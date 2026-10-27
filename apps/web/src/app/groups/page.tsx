import type { Metadata } from "next";
import { eq, inArray, or } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, UsersRound } from "lucide-react";
import { groupMembers, groups } from "@minyanmate/db/schema";
import { LeaveGroup } from "@/components/leave-group";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "@/app/my/sign-out-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUpcomingEventSummaries } from "@/lib/event-summaries";

export const metadata: Metadata = {
  title: "My groups",
};

export const dynamic = "force-dynamic";

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(startsAt: string): string {
  const time = startsAt.split("T")[1];
  if (!time) return startsAt;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return startsAt;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function groupColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function groupInitial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

export default async function GroupsDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const memberships = await db
    .select({
      groupId: groupMembers.groupId,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const memberGroupIds = memberships.map((m) => m.groupId);
  const roleByGroup = new Map(memberships.map((m) => [m.groupId, m.role]));

  const whereClause =
    memberGroupIds.length > 0
      ? or(eq(groups.ownerId, userId), inArray(groups.id, memberGroupIds))
      : eq(groups.ownerId, userId);

  const userGroups = await db.select().from(groups).where(whereClause);

  const cards = await Promise.all(
    userGroups.map(async (group) => {
      const summaries = await getUpcomingEventSummaries(userId, today, {
        kind: "group",
        groupId: group.id,
      });
      const visible = summaries.filter(
        (summary) => summary.event.status !== "cancelled",
      );
      const next = visible.length > 0 ? visible[0] : null;
      const isOwner = group.ownerId === userId;
      const isOrganiser = roleByGroup.get(group.id) === "organiser";
      return {
        group,
        next,
        isOwner,
        canManage: isOwner || isOrganiser,
      };
    }),
  );

  cards.sort((a, b) => {
    const aKey = a.next
      ? `${a.next.event.date}T${a.next.event.startsAt}`
      : null;
    const bKey = b.next
      ? `${b.next.event.date}T${b.next.event.startsAt}`
      : null;
    if (aKey && bKey) return aKey < bKey ? -1 : 1;
    if (aKey && !bKey) return -1;
    if (!aKey && bKey) return 1;
    return a.group.name.localeCompare(b.group.name);
  });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 space-y-8 py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My groups</h1>
            <p className="text-muted-foreground text-sm">
              All the groups you belong to, with their next upcoming minyan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/my">
                <UsersRound className="size-4" />
                My minyans
              </Link>
            </Button>
            <Button asChild>
              <Link href="/groups/new">
                <UsersRound className="size-4" />
                New group
              </Link>
            </Button>
          </div>
        </div>

        {cards.length === 0 && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No groups yet</CardTitle>
              <CardDescription>
                Create a group or join one with an invite link to see it here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild>
                <Link href="/groups/new">
                  <UsersRound className="size-4" />
                  New group
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/my">My minyans</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {cards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ group, next, isOwner, canManage }) => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <Link
                    href={`/groups/${group.slug}`}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: groupColor(group.name) }}
                      aria-hidden="true"
                    >
                      {groupInitial(group.name)}
                    </span>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </Link>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  {next ? (
                    <>
                      <Link
                        href={`/groups/${group.slug}`}
                        className="rounded-md border p-3 transition-colors hover:bg-accent/50"
                      >
                        <p className="text-sm font-medium">
                          {next.event.title ?? "Minyan"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(next.event.date)} ·{" "}
                          {formatTime(next.event.startsAt)} ·{" "}
                          {next.event.locationText ?? "No location set"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-green-600 dark:text-green-400">
                            {next.counts.in} in
                          </span>
                          {next.counts.maybe > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {next.counts.maybe} maybe
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {next.counts.out} out
                          </span>
                          {next.userRsvp && (
                            <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize">
                              {next.userRsvp === "in"
                                ? "Going"
                                : next.userRsvp === "out"
                                  ? "Not going"
                                  : "Maybe"}
                            </span>
                          )}
                        </div>
                      </Link>
                      <RsvpButtons
                        eventId={next.event.id}
                        currentStatus={next.userRsvp}
                      />
                    </>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-sm">
                      <p className="font-medium">No upcoming events</p>
                      <p className="text-muted-foreground text-xs">
                        Create one to get the group going.
                      </p>
                      {canManage ? (
                        <Button asChild size="sm" className="mt-2">
                          <Link href={`/events/new?group=${group.slug}`}>
                            <CalendarPlus className="size-4" />
                            New event
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="mt-2">
                          <Link href={`/groups/${group.slug}`}>View group</Link>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/groups/${group.slug}`}>View group</Link>
                    </Button>
                    {!isOwner && <LeaveGroup slug={group.slug} name={group.name} />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
