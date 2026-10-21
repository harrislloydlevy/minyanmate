import type { Metadata } from "next";
import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Church } from "lucide-react";
import { minyans, events } from "@minyanmate/db/schema";
import { occurrencesBetween, parseWeeklySchedule } from "@minyanmate/core";
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
  title: "My series",
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

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function MinyansPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const mine = await db
    .select()
    .from(minyans)
    .where(eq(minyans.ownerId, session.user.id));

  const rows = await Promise.all(
    mine.map(async (minyan) => {
      const [row] = await db
        .select({ value: count() })
        .from(events)
        .where(
          and(eq(events.minyanId, minyan.id), gte(events.date, today)),
        );
      const instanceCount = row?.value ?? 0;
      const schedule = parseWeeklySchedule(minyan.schedule);
      const next = schedule
        ? (occurrencesBetween(schedule, new Date(), 7)[0] ?? null)
        : null;
      return { minyan, instanceCount, schedule, next };
    }),
  );

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="container flex-1 space-y-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="w-fit -ml-2">
              <Link href="/my">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">My series</h1>
          </div>
          <Button asChild>
            <Link href="/minyans/new">
              <Church className="size-4" />
              New minyan
            </Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No series yet</CardTitle>
              <CardDescription>
                Create a recurring minyan and future events are generated for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/minyans/new">
                  <Church className="size-4" />
                  Create your first series
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map(({ minyan, instanceCount, schedule, next }) => (
              <Card key={minyan.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base">{minyan.name}</CardTitle>
                    {minyan.serviceTag && (
                      <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                        {capitalize(minyan.serviceTag)}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {schedule
                      ? `${schedule.weekdays.map((d) => WEEKDAY_LABELS[d] ?? d).join(", ")} ${formatTime(schedule.time)}`
                      : "Invalid schedule"}
                    {next ? ` · next: ${formatDate(next)}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 pt-0 text-xs text-muted-foreground">
                  <span>
                    {instanceCount} upcoming{" "}
                    {instanceCount === 1 ? "event" : "events"}
                    {minyan.locationText ? ` · ${minyan.locationText}` : ""}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/minyans/${minyan.id}`}>View events</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
