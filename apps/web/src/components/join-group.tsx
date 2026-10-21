"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/group-members";

interface JoinGroupProps {
  slug: string;
  name: string;
  token: string;
}

type JoinState = "confirm" | "joining" | "joined";

export function JoinGroup({ slug, name, token }: JoinGroupProps) {
  const router = useRouter();
  const [state, setState] = useState<JoinState>("confirm");
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setState("joining");
    setError(null);
    const result = await joinGroup(slug, token);
    if (result.success) {
      setState("joined");
      router.refresh();
    } else {
      setState("confirm");
      setError(result.error);
    }
  }

  function handleCancel() {
    router.replace(`/groups/${slug}`);
  }

  if (state === "joined") {
    return (
      <p
        className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
        data-testid="joined"
      >
        <CheckCircle2 className="size-4" />
        Joined ✓
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <UserPlus className="size-4" />
        Before you join
      </h3>
      <p className="text-muted-foreground mt-2 text-sm">
        You are about to join the Group {name}. This means you will be notified
        of new events and be prompted to RSVP as they occur.
      </p>
      {error && (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleJoin}
          disabled={state === "joining"}
        >
          {state === "joining" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {state === "joining" ? "Joining…" : "Join group"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={state === "joining"}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
