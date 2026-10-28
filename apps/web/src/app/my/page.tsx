import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { GuestMerge } from "@/components/guest-merge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getUpcomingEventSummaries } from "@/lib/event-summaries";
import { SimpleHome } from "./simple-home";

export const metadata: Metadata = {
  title: "Home",
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

  const visibleEvents = rsvpEvents
    .filter((summary) => summary.event.status !== "cancelled")
    .sort((a, b) => {
      if (a.event.date !== b.event.date) {
        return a.event.date.localeCompare(b.event.date);
      }
      return a.event.startsAt.localeCompare(b.event.startsAt);
    });

  const nextEvent = visibleEvents[0];

  return (
    <div className="flex min-h-svh flex-col">
      <GuestMerge />
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href="/my">
              <Settings className="size-5" />
            </Link>
          </Button>
          <SignOutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {nextEvent ? (
          <SimpleHome
            eventId={nextEvent.event.id}
            eventTitle={nextEvent.event.title}
            eventDate={nextEvent.event.date}
            eventTime={nextEvent.event.startsAt}
            location={nextEvent.event.locationText}
            currentStatus={nextEvent.userRsvp}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">No upcoming events</h1>
              <p className="text-muted-foreground">
                When a minyan is scheduled, it will appear here.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="icon" aria-label="Settings">
                <Link href="/my">
                  <Settings className="size-5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
