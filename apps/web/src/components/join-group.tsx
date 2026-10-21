"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinGroup } from "@/lib/actions/group-members";

interface JoinGroupProps {
  slug: string;
  name: string;
  token?: string;
  signedIn: boolean;
  fromRsvp?: boolean;
}

type JoinState = "confirm" | "joining" | "joined";

export function JoinGroup({
  slug,
  name,
  token,
  signedIn,
  fromRsvp = false,
}: JoinGroupProps) {
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
    router.replace(fromRsvp ? `/groups/${slug}?join=dismiss` : `/groups/${slug}`);
  }

  const dismissHref = fromRsvp
    ? `/groups/${slug}?join=dismiss`
    : `/groups/${slug}`;
  const explanation = fromRsvp
    ? `You've already RSVP'd to an event in the group ${name}. Join the group to see its other minyans and get updates.`
    : `You are about to join the group ${name}. This means you will be notified of new events and be prompted to RSVP as they occur.`;

  if (!signedIn) {
    const loginParams = new URLSearchParams({ joinGroup: slug });
    if (token) loginParams.set("joinToken", token);
    const loginHref = `/login?${loginParams.toString()}`;

    return (
      <div className="rounded-lg border bg-muted/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4" />
          Before you join
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{explanation}</p>
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm">
            <Link href={loginHref}>
              <UserPlus className="size-4" />
              Join group
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={dismissHref}>Not now</Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          You&apos;ll sign in with WhatsApp first.
        </p>
      </div>
    );
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
      <p className="text-muted-foreground mt-2 text-sm">{explanation}</p>
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
