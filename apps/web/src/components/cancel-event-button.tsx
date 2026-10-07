"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelEvent } from "@/lib/actions/cancel-event";

interface CancelEventButtonProps {
  eventId: string;
}

export function CancelEventButton({ eventId }: CancelEventButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    if (!window.confirm(
      "Are you sure you want to cancel this event? This will notify all attendees.",
    )) {
      return;
    }

    setSubmitting(true);
    const result = await cancelEvent(eventId);
    if (result.success) {
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClick}
      disabled={submitting}
    >
      <Tag className="size-3 mr-1" />
      Cancel Event
    </Button>
  );
}
