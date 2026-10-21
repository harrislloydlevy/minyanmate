import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

/** Shared schedule fields for creating a group or adding recurrence to one. */
export function RecurrenceFields() {
  return (
    <>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium leading-none">Weekdays</legend>
        <div className="flex flex-wrap gap-3 pt-1">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="weekdays"
                value={day.value}
                className="accent-primary size-4"
              />
              {day.label}
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Select all seven for a daily minyan.</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="time">Time</Label>
        <Input id="time" name="time" type="time" required />
      </div>
    </>
  );
}
