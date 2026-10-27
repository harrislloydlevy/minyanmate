import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EventSummary } from "@/lib/event-summaries";

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

export function EventCard({ summary }: { summary: EventSummary }) {
  const { event, counts, notRsvpdCount, userRsvp } = summary;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">
              {event.title ?? "Minyan"}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {formatTime(event.startsAt)}
              </span>
              {event.status === "cancelled" && (
                <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[0.625rem] font-medium">
                  Cancelled
                </span>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">
            {formatDate(event.date)} · {event.locationText ?? "No location set"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0 text-xs">
          <span className="text-green-600 dark:text-green-400">
            {counts.in} in
          </span>
          {counts.maybe > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {counts.maybe} maybe
            </span>
          )}
          <span className="text-muted-foreground">{counts.out} out</span>
          {notRsvpdCount !== null && (
            <span className="text-muted-foreground">
              {notRsvpdCount} not RSVP&apos;d
            </span>
          )}
          {userRsvp && event.status !== "cancelled" && (
            <span className="ml-auto rounded-full border px-2 py-0.5 text-[0.625rem] font-medium capitalize">
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
  );
}
