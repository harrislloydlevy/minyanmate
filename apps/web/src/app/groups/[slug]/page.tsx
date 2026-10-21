import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import {
  CalendarPlus,
  MapPin,
  StickyNote,
  UsersRound,
} from "lucide-react";
import { groupMembers, groups, users } from "@minyanmate/db/schema";
import { EventCard } from "@/components/event-card";
import { JoinGroup } from "@/components/join-group";
import { JoinLink } from "@/components/join-link";
import { LeaveGroup } from "@/components/leave-group";
import { MemberActions } from "@/components/member-actions";
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
  title: "Group details",
};

export const dynamic = "force-dynamic";

type MemberRow = {
  userId: string;
  role: "organiser" | "member";
  name: string;
  isOwner: boolean;
};

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
        <header className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Minyan<span className="text-primary">Mate</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="container flex flex-1 items-start justify-center py-10">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Group not found</CardTitle>
              <CardDescription>
                This group may have been deleted or never existed.
              </CardDescription>
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
  const viewerMember = isAuthenticated
    ? memberById.get(session.user.id)
    : undefined;
  const isMember = isOwner || !!viewerMember;
  const canManage = isOwner || viewerMember?.role === "organiser";

  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = await getUpcomingEventSummaries(
    session?.user.id ?? null,
    today,
    { kind: "group", groupId: group.id },
  );

  const inviteAccepted =
    !!joinTokenParam && !!group.joinToken && joinTokenParam === group.joinToken;
  const showJoin = !isMember && !!joinTokenParam && inviteAccepted;
  const invalidInvite = !isMember && !!joinTokenParam && !inviteAccepted;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="container flex flex-1 items-start justify-center py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-xl">{group.name}</CardTitle>
              </div>
              {isOwner && (
                <span className="text-muted-foreground text-xs">You own this group</span>
              )}
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
            </dl>

            {showJoin && (
              <JoinGroup
                slug={group.slug}
                name={group.name}
                token={joinTokenParam}
                signedIn={isAuthenticated}
              />
            )}
            {invalidInvite && (
              <p className="text-destructive text-sm">This invite link is not valid.</p>
            )}

            <div className="border-t pt-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Upcoming minyans</h3>
              {upcomingEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {upcomingEvents.map((summary) => (
                    <EventCard key={summary.event.id} summary={summary} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No upcoming minyans.
                </p>
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
                        <MemberActions
                          groupId={group.id}
                          userId={m.userId}
                          role={m.role}
                        />
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
                <LeaveGroup slug={group.slug} name={group.name} />
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
