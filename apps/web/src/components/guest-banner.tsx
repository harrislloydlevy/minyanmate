"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    document.cookie =
      "guest_banner_dismissed=1; path=/; max-age=31536000; samesite=lax";
    setDismissed(true);
  }

  return (
    <div className="border-primary/30 bg-primary/5 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <p className="flex items-center gap-2">
        <Sparkles className="text-primary size-4 shrink-0" />
        <span>
          Coming regularly?{" "}
          <Link href="/login" className="underline">
            Create an account to keep your history.
          </Link>
        </span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="shrink-0"
      >
        <X className="size-3" />
        Not now
      </Button>
    </div>
  );
}
