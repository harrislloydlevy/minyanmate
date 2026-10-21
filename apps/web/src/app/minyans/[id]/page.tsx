import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Church,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { minyans } from "@minyanmate/db/schema";
import { parseWeeklySchedule } from "@minyanmate/core";
import { EventCard } from "@/components/event-card";
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
  title: "Series details",
};

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function MinyanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;

  const [minyan] = await db
    .select()
    .from(minyans)
    .where(eq(minyans.id, id))
    .limit(1);

  if (!minyan || minyan.ownerId !== session.user.id) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const summaries = await getUpcomingEventSummaries(
    session.user.id,
    today,
    { kind: "minyan", minyanId: minyan.id },
  );
  const schedule = parseWeeklySchedule(minyan.schedule);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="container flex-1 space-y-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="-ml-2 w-fit">
              <Link href="/minyans">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {minyan.name}
                </h1>
                {minyan.serviceTag && (
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                    {capitalize(minyan.serviceTag)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {schedule
                  ? `${schedule.weekdays.map((d) => WEEKDAY_LABELS[d] ?? d).join(", ")} at ${formatTime(schedule.time)}`
                  : "Invalid schedule"}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/minyans/new">
              <Church className="size-4" />
              New minyan
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Series details</CardTitle>
            {minyan.description && (
              <CardDescription>{minyan.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Location</p>
                <p>{minyan.locationText ?? "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Quorum target</p>
                <p>{minyan.quorumTarget}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Upcoming events</p>
                <p>{summaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Upcoming events</h2>
          {summaries.length === 0 ? (
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>No upcoming events</CardTitle>
                <CardDescription>
                  Instances are generated for the next four weeks when a series
                  is created.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {summaries.map((summary) => (
                <EventCard key={summary.event.id} summary={summary} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
