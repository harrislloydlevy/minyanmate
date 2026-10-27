"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteFromWaitlist, promoteGuestFromWaitlist } from "@/lib/actions/rsvp";

export function PromoteWaitlistButton({
  eventId,
  userId,
  guestId,
}: {
  eventId: string;
  userId?: string;
  guestId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = guestId
        ? await promoteGuestFromWaitlist(eventId, guestId)
        : await promoteFromWaitlist(eventId, userId ?? "");
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
        Promote
      </button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
