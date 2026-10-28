"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setRsvp } from "@/lib/actions/rsvp";
import { WeeklyAttendanceGrid } from "@/components/weekly-attendance-grid";
import { HelpButton } from "@/components/help-button";

interface SimpleHomeProps {
  eventId: string;
  eventTitle: string | null;
  eventDate: string;
  eventTime: string;
  location: string | null;
  currentStatus: "in" | "out" | "maybe" | null;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

export function SimpleHome({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  location,
  currentStatus,
}: SimpleHomeProps) {
  const router = useRouter();

  async function handleRsvp(status: "in" | "out") {
    const result = await setRsvp(eventId, status);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-md text-center space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Next upcoming event
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {eventTitle ?? "Minyan"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {formatDate(eventDate)} · {formatTime(eventTime)}
        </p>
        {location && (
          <p className="text-base text-muted-foreground">{location}</p>
        )}
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <Button
          size="lg"
          className="h-20 text-2xl font-bold"
          variant={currentStatus === "in" ? "default" : "default"}
          onClick={() => handleRsvp("in")}
        >
          I'm Coming
        </Button>
        <Button
          size="lg"
          className="h-20 text-2xl font-bold"
          variant={currentStatus === "out" ? "secondary" : "secondary"}
          onClick={() => handleRsvp("out")}
        >
          I Can't Make It
        </Button>
      </div>

      <WeeklyAttendanceGrid />

      <div className="w-full max-w-md flex justify-center">
        <HelpButton />
      </div>
    </div>
  );
}
