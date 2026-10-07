import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  StickyNote,
  Tag,
  Users,
} from "lucide-react";
import { events, rsvps, guests, users } from "@minyanmate/db/schema";
import { relativeAge } from "@minyanmate/core";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { GuestRsvpButtons } from "@/components/guest-rsvp-buttons";
import type { RsvpStatus } from "@/lib/actions/rsvp";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Event details",
};

export const dynamic = "force-dynamic";

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(startsAt: string): string {
  const time = startsAt.split("T")[1];
  if (!time) return startsAt;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function relativeLabel(timestamp: Date): string {
  const bucket = relativeAge(timestamp);
  switch (bucket) {
    case "just now":
      return "just now";
    case "minutes":
      return "in the last hour";
    case "hours":
      return "earlier today";
    default:
      return "recently";
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = !!session;

  const { id } = await params;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Minyan<span className="text-primary">Mate</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-start justify-center py-10">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Event not found</CardTitle>
              <CardDescription>
                This event may have been deleted or never existed.
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

  const isOwner = session ? event.ownerId === session.user.id : false;

  // RSVP counts from authenticated users
  const rsvpRows = await db
    .select({
      status: rsvps.status,
      userId: rsvps.userId,
      userName: users.name,
    })
    .from(rsvps)
    .leftJoin(users, eq(rsvps.userId, users.id))
    .where(eq(rsvps.eventId, event.id));

  // Guest RSVPs
  const guestRows = await db
    .select()
    .from(guests)
    .where(eq(guests.eventId, event.id));

  const confirmedCount =
    rsvpRows.filter((r) => r.status === "in").length +
    guestRows.filter((r) => r.status === "in").length;
  const maybeCount =
    rsvpRows.filter((r) => r.status === "maybe").length +
    guestRows.filter((r) => r.status === "maybe").length;
  const declinedCount =
    rsvpRows.filter((r) => r.status === "out").length +
    guestRows.filter((r) => r.status === "out").length;
  const userRsvp =
    (session ? rsvpRows.find((r) => r.userId === session.user.id)?.status : null) ??
    null;

  type RsvpDisplay = {
    name: string;
    status: string;
    isGuest: boolean;
  };

  const allRsvps: RsvpDisplay[] = [
    ...rsvpRows.map((r) => ({
      name: r.userName ?? "Unknown",
      status: r.status,
      isGuest: false,
    })),
    ...guestRows.map((r) => ({
      name: r.name,
      status: r.status,
      isGuest: true,
    })),
  ];

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
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-xl">
                  {event.typeTag === "pickup" ? "Pickup" : "Minyan"} on{" "}
                  {formatDate(event.date)}
                </CardTitle>
                <CardDescription>Event details</CardDescription>
              </div>
              {isOwner && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/events/${event.id}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            {event.lastEditedAt && (
              <p className="text-muted-foreground text-xs" data-testid="last-edited">
                Details updated {relativeLabel(event.lastEditedAt)}
              </p>
            )}

            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Date</dt>
                  <dd>{formatDate(event.date)}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Start time</dt>
                  <dd>{formatTime(event.startsAt)}</dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Location</dt>
                  <dd>{event.locationText ?? "Not set"}</dd>
                </div>
              </div>

              {event.notes && (
                <div className="flex items-start gap-3">
                  <StickyNote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Notes</dt>
                    <dd>{event.notes}</dd>
                  </div>
                </div>
              )}

              {event.typeTag && (
                <div className="flex items-start gap-3">
                  <Tag className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Type</dt>
                    <dd className="capitalize">{event.typeTag}</dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="border-t pt-4 flex flex-col gap-3">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Users className="size-4" />
                {confirmedCount} in · {maybeCount} maybe · {declinedCount} out
              </div>

              {isAuthenticated ? (
                <RsvpButtons eventId={event.id} currentStatus={userRsvp as RsvpStatus | null} />
              ) : (
                <GuestRsvpButtons eventId={event.id} />
              )}
            </div>

            {allRsvps.length > 0 && (
              <div className="border-t pt-4 flex flex-col gap-3">
                <h3 className="text-sm font-semibold">RSVPs</h3>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {allRsvps.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        className={
                          r.status === "in"
                            ? "text-green-600 dark:text-green-400"
                            : r.status === "maybe"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                        }
                      >
                        {r.name}
                      </span>
                      <span className="text-xs">
                        ({r.status === "in" ? "coming" : r.status === "maybe" ? "maybe" : "not coming"})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isAuthenticated && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/my">Back to my minyans</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
