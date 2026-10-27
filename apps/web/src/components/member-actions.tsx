"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeMember, setMemberRole } from "@/lib/actions/group-members";

interface MemberActionsProps {
  groupId: string;
  userId: string;
  role: "organiser" | "member";
}

export function MemberActions({ groupId, userId, role }: MemberActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleRole() {
    setSubmitting(true);
    setError(null);
    const result = await setMemberRole(
      groupId,
      userId,
      role === "organiser" ? "member" : "organiser",
    );
    if (!result.success) setError(result.error);
    setSubmitting(false);
    router.refresh();
  }

  async function handleRemove() {
    if (!window.confirm("Remove this member from the group?")) return;
    setSubmitting(true);
    setError(null);
    const result = await removeMember(groupId, userId);
    if (!result.success) setError(result.error);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggleRole}
          disabled={submitting}
        >
          {submitting ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : role === "organiser" ? (
            <ArrowDown className="size-3" />
          ) : (
            <ArrowUp className="size-3" />
          )}
          {role === "organiser" ? "Demote" : "Promote"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          disabled={submitting}
        >
          <Trash2 className="size-3" />
          Remove
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
