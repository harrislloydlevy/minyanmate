"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
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
  defaultDate: string;
  defaultTime: string;
  defaultLocation: string | null;
  defaultNotes: string | null;
  defaultTypeTag: string | null;
}

export function EditEventForm({
  eventId,
  defaultDate,
  defaultTime,
  defaultLocation,
  defaultNotes,
  defaultTypeTag,
}: EditEventFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    UpdateEventResult | null,
    FormData
  >(updateEvent, null);

  if (state?.success) {
    router.push(`/events/${eventId}`);
  }

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

          <div className="flex flex-col gap-2">
            <Label htmlFor="typeTag">
              Type <span className="text-muted-foreground">(optional)</span>
            </Label>
            <select
              id="typeTag"
              name="typeTag"
              data-slot="input"
              className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
              defaultValue={defaultTypeTag ?? ""}
            >
              <option value="">No type</option>
              <option value="minyan">Minyan</option>
              <option value="pickup">Pickup</option>
            </select>
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
