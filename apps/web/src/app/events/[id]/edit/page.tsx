import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { events } from "@minyanmate/db/schema";
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
import { EditEventForm } from "./edit-event-form";

export const metadata: Metadata = {
  title: "Edit event",
};

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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

  // Only the owner may edit
  if (event.ownerId !== session.user.id) {
    redirect(`/events/${event.id}`);
  }

  const date = event.date;
  const time = event.startsAt.split("T")[1] ?? "00:00";

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
        <EditEventForm
          eventId={event.id}
          defaultDate={date}
          defaultTime={time}
          defaultLocation={event.locationText}
          defaultNotes={event.notes}
          defaultTypeTag={event.typeTag}
        />
      </main>
    </div>
  );
}
