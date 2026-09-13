"use client";

import { CalendarPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createEvent, type CreateEventResult } from "@/lib/actions/create-event";
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

export function EventForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateEventResult | null>(
    createEvent,
    null,
  );

  if (state?.success) {
    router.push("/my");
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-xl">
          <CalendarPlus className="size-6" />
        </div>
        <CardTitle className="text-xl">New event</CardTitle>
        <CardDescription>
          Create a one-off minyan or pickup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Event title</Label>
            <Input
              id="name"
              name="name"
              type="text"
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
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Start time</Label>
            <Input
              id="time"
              name="time"
              type="time"
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
            >
              <option value="">No type</option>
              <option value="minyan">Minyan</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>

          {state && !state.success && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            {pending ? "Creating…" : "Create event"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
