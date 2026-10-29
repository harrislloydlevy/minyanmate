import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickRsvp } from "@/components/quick-rsvp";
import { formatEventDate, formatEventTime } from "@/lib/format-event";
import type { EventSummary } from "@/lib/event-summaries";

interface EventCardProps {
  summary: EventSummary;
  /** Show in-card RSVP controls (signed-in users on /my). */
  showQuickRsvp?: boolean;
  /**
   * Recurring series cards only show the date; time and location live once in
   * the group section heading.
   */
  compact?: boolean;
}

export function EventCard({ summary, showQuickRsvp = false, compact = false }: EventCardProps) {
  const { event, counts, notRsvpdCount, userRsvp } = summary;
  const title = event.title ?? "Minyan";

  return (
    <Card className="relative transition-colors hover:bg-accent/50">
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={`Open ${compact ? formatEventDate(event.date) : title}`}
      />
      <CardHeader className="pointer-events-none relative z-10 pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">
            {compact ? formatEventDate(event.date) : title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {!compact && (
              <span className="text-muted-foreground text-xs">
                {formatEventTime(event.startsAt)}
              </span>
            )}
            {event.status === "cancelled" && (
              <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[10px] font-medium">
                Cancelled
              </span>
            )}
          </div>
        </div>
        {!compact && (
          <CardDescription className="text-xs">
            {formatEventDate(event.date)} · {event.locationText ?? "No location set"}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-3 gap-y-2 pt-0 text-xs">
        <span className="text-green-600 dark:text-green-400">{counts.in} in</span>
        {counts.maybe > 0 && (
          <span className="text-amber-600 dark:text-amber-400">{counts.maybe} maybe</span>
        )}
        <span className="text-muted-foreground">{counts.out} out</span>
        {notRsvpdCount !== null && (
          <span className="text-muted-foreground">{notRsvpdCount} not RSVP&apos;d</span>
        )}
        {showQuickRsvp && event.status !== "cancelled" && (
          <div className="pointer-events-auto ml-auto">
            <QuickRsvp eventId={event.id} currentStatus={userRsvp} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
