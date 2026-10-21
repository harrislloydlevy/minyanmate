"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaveGroup } from "@/lib/actions/group-members";

interface LeaveGroupProps {
  slug: string;
  name: string;
}

export function LeaveGroup({ slug, name }: LeaveGroupProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    if (
      !window.confirm(
        `Leave ${name}? You will stop receiving notifications for its events.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await leaveGroup(slug);
    if (result.success) {
      router.push("/my");
      return;
    }
    setError(result.error);
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive w-full"
        onClick={handleLeave}
        disabled={submitting}
      >
        {submitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        {submitting ? "Leaving…" : "Leave group"}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
