"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { joinGroup } from "@/lib/actions/group-members";

interface JoinGroupProps {
  slug: string;
  token: string;
}

type JoinState = "joining" | "joined" | "error";

export function JoinGroup({ slug, token }: JoinGroupProps) {
  const router = useRouter();
  const [state, setState] = useState<JoinState>("joining");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    joinGroup(slug, token).then((result) => {
      if (result.success) {
        setState("joined");
        router.refresh();
      } else {
        setState("error");
        setError(result.error);
      }
    });
  }, [slug, token, router]);

  if (state === "joining") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircle className="size-4 animate-spin" />
        Joining group…
      </p>
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

  return <p className="text-destructive text-sm">{error}</p>;
}
