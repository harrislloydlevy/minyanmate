"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateEvent, type UpdateEventResult } from "@/lib/actions/update-event";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditEventFormProps {
  eventId: string;
  defaultTitle: string | null;
  defaultDate: string;
  defaultTime: string;
  defaultLocation: string | null;
  defaultNotes: string | null;
}

export function EditEventForm({
  eventId,
  defaultTitle,
  defaultDate,
  defaultTime,
  defaultLocation,
  defaultNotes,
}: EditEventFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateEventResult | null,
    FormData
  >(updateEvent, null);

  useEffect(() => {
    if (state?.success) {
      router.push(`/events/${eventId}`);
    }
  }, [state, eventId, router]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Edit event</CardTitle>
        <CardDescription>
          Update the event details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="eventId" value={eventId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Event title</Label>
            <Input
              id="title"
              name="title"
              type="text"
              defaultValue={defaultTitle ?? ""}
              placeholder="Shacharis at the shul"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Start time</Label>
            <Input
              id="time"
              name="time"
              type="time"
              defaultValue={defaultTime}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">
              Location <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="location"
              name="location"
              type="text"
              defaultValue={defaultLocation ?? ""}
              placeholder="123 Main St, room 2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="notes"
              name="notes"
              type="text"
              defaultValue={defaultNotes ?? ""}
              placeholder="Bring a siddur"
            />
          </div>

          {state && !state.success && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
