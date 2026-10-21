"use client";

import { Church, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { createMinyan, type CreateMinyanResult } from "@/lib/actions/create-minyan";
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

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function MinyanForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateMinyanResult | null, FormData>(
    createMinyan,
    null
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/minyans");
    }
  }, [state?.success, router]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-xl">
          <Church className="size-6" />
        </div>
        <CardTitle className="text-xl">New minyan</CardTitle>
        <CardDescription>
          Set a weekly or daily schedule and future events are generated
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Shacharis at the shul"
              required
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none">Weekdays</legend>
            <div className="flex flex-wrap gap-3 pt-1">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={day.value}
                    className="size-4 rounded border-input accent-primary"
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Select every weekday for a daily minyan.
            </p>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Start time</Label>
            <Input id="time" name="time" type="time" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceTag">
              Service <span className="text-muted-foreground">(optional)</span>
            </Label>
            <select
              id="serviceTag"
              name="serviceTag"
              data-slot="input"
              className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
            >
              <option value="">None</option>
              <option value="shacharit">Shacharit</option>
              <option value="mincha">Mincha</option>
              <option value="maariv">Maariv</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="locationText">
              Location <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="locationText"
              name="locationText"
              type="text"
              placeholder="123 Main St, room 2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quorumTarget">Quorum target</Label>
            <Input
              id="quorumTarget"
              name="quorumTarget"
              type="number"
              min={1}
              defaultValue={10}
            />
          </div>

          {state && !state.success && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Church className="size-4" />
            )}
            {pending ? "Creating…" : "Create minyan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
