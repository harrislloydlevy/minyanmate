"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCookie } from "@/lib/cookies";
import { GUEST_NAME_SELECTED_EVENT, type GuestNameSelectedDetail } from "@/lib/guest-identity";
import type { RsvpStatus } from "@/lib/actions/rsvp";

interface ThisIsMeButtonProps {
  name: string;
  status?: RsvpStatus;
}

/**
 * Lets a signed-out guest claim an existing guest RSVP from the list. The name
 * is copied into the RSVP form (and the `guest_name` cookie) so the next
 * response they submit updates that guest row instead of creating a new one.
 */
export function ThisIsMeButton({ name, status }: ThisIsMeButtonProps) {
  function handleClick() {
    setCookie("guest_name", name);
    window.dispatchEvent(
      new CustomEvent<GuestNameSelectedDetail>(GUEST_NAME_SELECTED_EVENT, {
        detail: { name, status },
      }),
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={handleClick}
      aria-label={`This is me — ${name}`}
    >
      <UserCheck className="size-4" />
      This is me
    </Button>
  );
}
