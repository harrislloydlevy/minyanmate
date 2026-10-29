"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { setRsvp, type RsvpStatus } from "@/lib/actions/rsvp";

interface QuickRsvpProps {
  eventId: string;
  currentStatus: RsvpStatus | null;
}

const options: {
  status: RsvpStatus;
  label: string;
  icon: React.ReactNode;
  active: string;
}[] = [
  {
    status: "in",
    label: "Going",
    icon: <ThumbsUp className="size-3" />,
    active: "border-green-600 bg-green-600 text-white",
  },
  {
    status: "maybe",
    label: "Maybe",
    icon: <Minus className="size-3" />,
    active: "border-amber-500 bg-amber-500 text-white",
  },
  {
    status: "out",
    label: "Not going",
    icon: <ThumbsDown className="size-3" />,
    active: "border-muted-foreground bg-muted-foreground text-background",
  },
];

/** Compact RSVP control for feed cards; changes attendance in place. */
export function QuickRsvp({ eventId, currentStatus }: QuickRsvpProps) {
  const router = useRouter();
  const [status, setStatus] = useState<RsvpStatus | null>(currentStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: RsvpStatus) {
    if (pending || next === status) return;
    const previous = status;
    setStatus(next);
    setError(null);
    setPending(true);
    const result = await setRsvp(eventId, next);
    setPending(false);
    if (!result.success) {
      setStatus(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="relative flex items-center gap-1">
      {options.map((option) => {
        const selected = status === option.status;
        return (
          <button
            key={option.status}
            type="button"
            onClick={() => choose(option.status)}
            disabled={pending}
            aria-pressed={selected}
            aria-label={option.label}
            title={option.label}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-all",
              selected
                ? option.active
                : "text-muted-foreground border-border bg-background opacity-45 hover:opacity-100",
              pending && "pointer-events-none",
            )}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
      {error && (
        <span
          role="status"
          aria-live="polite"
          className="text-destructive absolute -top-4 right-0 text-[10px] whitespace-nowrap"
        >
          {error}
        </span>
      )}
    </div>
  );
}
