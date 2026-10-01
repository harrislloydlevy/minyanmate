"use client";

import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setRsvp, type RsvpStatus } from "@/lib/actions/rsvp";

interface RsvpButtonsProps {
  eventId: string;
  currentStatus: RsvpStatus | null;
}

const options: { status: RsvpStatus; label: string; icon: React.ReactNode }[] =
  [
    { status: "in", label: "Yes", icon: <ThumbsUp className="size-4" /> },
    { status: "maybe", label: "Maybe", icon: <Minus className="size-4" /> },
    { status: "out", label: "No", icon: <ThumbsDown className="size-4" /> },
  ];

export function RsvpButtons({ eventId, currentStatus }: RsvpButtonsProps) {
  const router = useRouter();

  async function handleClick(status: RsvpStatus) {
    const result = await setRsvp(eventId, status);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <Button
          key={opt.status}
          variant={currentStatus === opt.status ? "default" : "outline"}
          size="sm"
          onClick={() => handleClick(opt.status)}
          className="flex-1"
        >
          {opt.icon}
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
