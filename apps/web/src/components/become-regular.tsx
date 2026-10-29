"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/group-members";

interface BecomeRegularProps {
  slug: string;
}

type JoinState = "idle" | "joining" | "joined";

/** Joins the group and swaps itself for the member marker on success. */
export function BecomeRegular({ slug }: BecomeRegularProps) {
  const router = useRouter();
  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setState("joining");
    setError(null);
    const result = await joinGroup(slug);
    if (result.success) {
      setState("joined");
      router.refresh();
    } else {
      setState("idle");
      setError(result.error);
    }
  }

  if (state === "joined") {
    return <span className="text-muted-foreground text-xs">(Member)</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleJoin}
        disabled={state === "joining"}
      >
        {state === "joining" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        {state === "joining" ? "Joining…" : "Become Regular"}
      </Button>
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
