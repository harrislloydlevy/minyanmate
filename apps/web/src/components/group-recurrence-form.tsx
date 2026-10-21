"use client";

import { Clock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { setGroupRecurrence, type SetGroupRecurrenceResult } from "@/lib/actions/group-recurrence";
import { RecurrenceFields } from "@/components/recurrence-fields";
import { Button } from "@/components/ui/button";

export function GroupRecurrenceForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SetGroupRecurrenceResult | null, FormData>(
    setGroupRecurrence,
    null,
  );

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <RecurrenceFields />

      {state && !state.success && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Clock className="size-4" />}
        {pending ? "Saving…" : "Set recurring schedule"}
      </Button>
    </form>
  );
}
