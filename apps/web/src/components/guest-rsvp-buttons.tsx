"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setGuestRsvp, type RsvpStatus } from "@/lib/actions/rsvp";
import { getCookie } from "@/lib/cookies";

interface GuestRsvpButtonsProps {
  eventId: string;
}

const options: { status: RsvpStatus; label: string; icon: React.ReactNode }[] =
  [
    { status: "in", label: "Coming", icon: <ThumbsUp className="size-4" /> },
    { status: "maybe", label: "Maybe", icon: <Minus className="size-4" /> },
    { status: "out", label: "Not Coming", icon: <ThumbsDown className="size-4" /> },
  ];

export function GuestRsvpButtons({ eventId }: GuestRsvpButtonsProps) {
  const router = useRouter();
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currentStatus, setCurrentStatus] = useState<RsvpStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getCookie("guest_token");
    setGuestToken(token);
  }, []);

  async function handleClick(status: RsvpStatus) {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await setGuestRsvp(eventId, name.trim(), status, guestToken ?? undefined);
    if (result.success) {
      setCurrentStatus(status);
      setGuestToken(result.guestToken);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {!guestToken && (
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
      )}

      <div className="flex gap-2">
        {options.map((opt) => (
          <Button
            key={opt.status}
            variant={currentStatus === opt.status ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(opt.status)}
            disabled={submitting || (!guestToken && !name.trim())}
            className="flex-1"
          >
            {opt.icon}
            {opt.label}
          </Button>
        ))}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
