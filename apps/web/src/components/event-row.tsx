import Link from "next/link";
import { QuickRsvp } from "@/components/quick-rsvp";
import { formatEventDate, formatEventTime } from "@/lib/format-event";
import type { EventSummary } from "@/lib/event-summaries";

interface EventRowProps {
  summary: EventSummary;
  showQuickRsvp?: boolean;
  /** Recurring instance: show only the date; time/location live in the group heading. */
  compact?: boolean;
}

/** One-line event entry inside a group card. */
export function EventRow({ summary, showQuickRsvp = false, compact = false }: EventRowProps) {
  const { event, counts, notRsvpdCount, userRsvp } = summary;
  const title = event.title ?? "Minyan";

  return (
    <li className="relative">
      <Link
        href={`/events/${event.id}`}
        className="absolute inset-0 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
        aria-label={`Open ${compact ? formatEventDate(event.date) : title}`}
      />
      <div className="pointer-events-none relative z-10 flex min-h-9 items-center gap-2 py-1.5">
        <span className="text-sm font-medium whitespace-nowrap">
          {compact ? formatEventDate(event.date) : title}
        </span>
        {!compact && (
          <span className="text-muted-foreground truncate text-xs">
            {formatEventDate(event.date)} · {formatEventTime(event.startsAt)} ·{" "}
            {event.locationText ?? "No location set"}
          </span>
        )}
        {event.status === "cancelled" && (
          <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[10px] font-medium">
            Cancelled
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground hidden items-center gap-2 text-[11px] sm:flex">
            <span className="text-green-600 dark:text-green-400">{counts.in} in</span>
            {counts.maybe > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{counts.maybe} maybe</span>
            )}
            {notRsvpdCount !== null && notRsvpdCount > 0 && <span>{notRsvpdCount} no reply</span>}
          </span>
          {showQuickRsvp && event.status !== "cancelled" && (
            <div className="pointer-events-auto">
              <QuickRsvp eventId={event.id} currentStatus={userRsvp} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
