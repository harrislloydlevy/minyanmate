import type { Metadata } from "next";
import { eq, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { events, rsvps, users } from "@minyanmate/db/schema";
import { SignOutButton } from "./sign-out-button";
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

export const metadata: Metadata = {
  title: "My minyans",
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

export default async function MyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const today = new Date().toISOString().split("T")[0] ?? "";

  // Fetch all events with RSVP counts and the current user's RSVP
  const allEvents = await db
    .select({
      event: events,
      rsvpStatus: rsvps.status,
      rsvpUserId: rsvps.userId,
      rsvpUserName: users.name,
    })
    .from(events)
    .leftJoin(rsvps, eq(rsvps.eventId, events.id))
    .leftJoin(users, eq(rsvps.userId, users.id))
    .orderBy(asc(events.date), asc(events.startsAt));

  // Collapse joined rows into per-event summaries
  const eventMap = new Map<
    string,
    {
      event: (typeof allEvents)[0]["event"];
      counts: { in: number; maybe: number; out: number };
      userRsvp: string | null;
    }
  >();

  for (const row of allEvents) {
    const existing = eventMap.get(row.event.id);
    if (existing) {
      if (row.rsvpStatus) {
        existing.counts[row.rsvpStatus as keyof typeof existing.counts]++;
      }
      if (row.rsvpUserId === session.user.id && row.rsvpStatus) {
        existing.userRsvp = row.rsvpStatus;
      }
    } else {
      const counts = { in: 0, maybe: 0, out: 0 };
      let userRsvp: string | null = null;
      if (row.rsvpStatus) {
        counts[row.rsvpStatus as keyof typeof counts]++;
      }
      if (row.rsvpUserId === session.user.id && row.rsvpStatus) {
        userRsvp = row.rsvpStatus;
      }
      eventMap.set(row.event.id, { event: row.event, counts, userRsvp });
    }
  }

  const eventsList = Array.from(eventMap.values());

  const upcoming = eventsList.filter((e) => e.event.date >= today);
  const past = eventsList.filter((e) => e.event.date < today);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="container flex-1 space-y-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome{session.user.name ? `, ${session.user.name}` : ""}
            </h1>
            <p className="text-muted-foreground text-sm">
              Signed in as {session.user.phoneNumber ?? session.user.email}
            </p>
          </div>
          <Button asChild>
            <Link href="/events/new">
              <CalendarPlus className="size-4" />
              New event
            </Link>
          </Button>
        </div>

        {eventsList.length === 0 ? (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No events yet</CardTitle>
              <CardDescription>
                Create your first event to get started. You can set up a one-off
                minyan, a pickup game, or anything else.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/events/new">
                  <CalendarPlus className="size-4" />
                  Create your first event
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
                <div className="flex flex-col gap-3">
                  {upcoming.map(({ event, counts, userRsvp }) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className="transition-colors hover:bg-accent/50">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">
                              {event.typeTag === "pickup"
                                ? "Pickup"
                                : "Minyan"}{" "}
                              — {formatDate(event.date)}
                            </CardTitle>
                            <span className="text-muted-foreground text-xs">
                              {formatTime(event.startsAt)}
                            </span>
                          </div>
                          <CardDescription className="text-xs">
                            {event.locationText ?? "No location set"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3 pt-0 text-xs">
                          <span className="text-green-600 dark:text-green-400">
                            {counts.in} in
                          </span>
                          {counts.maybe > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {counts.maybe} maybe
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {counts.out} out
                          </span>
                          {userRsvp && (
                            <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize">
                              {userRsvp === "in"
                                ? "Going"
                                : userRsvp === "out"
                                  ? "Not going"
                                  : "Maybe"}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-muted-foreground">
                  Past
                </h2>
                <div className="flex flex-col gap-3 opacity-70">
                  {past.map(({ event, counts }) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">
                              {event.typeTag === "pickup"
                                ? "Pickup"
                                : "Minyan"}{" "}
                              — {formatDate(event.date)}
                            </CardTitle>
                            <span className="text-muted-foreground text-xs">
                              {formatTime(event.startsAt)}
                            </span>
                          </div>
                          <CardDescription className="text-xs">
                            {event.locationText ?? "No location set"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-3 pt-0 text-xs">
                          <span className="text-green-600 dark:text-green-400">
                            {counts.in} in
                          </span>
                          {counts.maybe > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {counts.maybe} maybe
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {counts.out} out
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
