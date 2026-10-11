"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mergeGuestRsvps } from "@/lib/actions/rsvp";
import { getCookie } from "@/lib/cookies";

/**
 * Safety net for the guest→account merge: the login flow already merges,
 * but this picks up any leftover guest RSVPs (e.g. if that call failed).
 */
export function GuestMerge() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!getCookie("guest_token")) return;
    started.current = true;

    mergeGuestRsvps().then((result) => {
      if (result.success && result.merged > 0) {
        router.refresh();
      }
    });
  }, [router]);

  return null;
}
