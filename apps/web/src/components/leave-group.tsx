"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaveGroup } from "@/lib/actions/group-members";

interface LeaveGroupCandidate {
  userId: string;
  name: string;
}

interface LeaveGroupProps {
  slug: string;
  name: string;
  isSoleOrganiser?: boolean;
  candidates?: LeaveGroupCandidate[];
  /** Page to open after leaving. Defaults to `/my`. */
  redirectTo?: string;
}

export function LeaveGroup({
  slug,
  name,
  isSoleOrganiser = false,
  candidates = [],
  redirectTo = "/my",
}: LeaveGroupProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSole, setShowSole] = useState(false);
  const [selectedOrganiser, setSelectedOrganiser] = useState<string>(candidates[0]?.userId ?? "");

  async function doLeave(newOrganiserUserId?: string) {
    setSubmitting(true);
    setError(null);
    const result = await leaveGroup(slug, newOrganiserUserId);
    if (result.success) {
      router.refresh();
      router.push(redirectTo);
      return;
    }
    setError(result.error);
    setSubmitting(false);
  }

  function handleLeaveClick() {
    setError(null);
    if (isSoleOrganiser) {
      setShowSole(true);
      return;
    }
    setShowConfirm(true);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={handleLeaveClick}
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

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-sm rounded-lg border p-4 shadow-lg">
            <h2 className="text-sm font-semibold">Leave {name}?</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              All of your RSVPs for future events in this group will be cancelled. Your attendance
              at past events is preserved.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => doLeave()}
                disabled={submitting}
              >
                {submitting ? "Leaving…" : "Leave group"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-sm rounded-lg border p-4 shadow-lg">
            <h2 className="text-sm font-semibold">Assign a new organiser</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              You are the sole organiser of {name}. Choose a member to promote before you can leave.
              All of your future RSVPs will be cancelled.
            </p>
            {candidates.length === 0 ? (
              <p className="text-destructive mt-3 text-xs">
                There are no other members to promote. Invite someone first.
              </p>
            ) : (
              <select
                className="mt-3 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
                value={selectedOrganiser}
                onChange={(e) => setSelectedOrganiser(e.target.value)}
                disabled={submitting}
              >
                {candidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name || "Unknown"}
                  </option>
                ))}
              </select>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSole(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => doLeave(selectedOrganiser)}
                disabled={submitting || candidates.length === 0 || !selectedOrganiser}
              >
                {submitting ? "Leaving…" : "Assign and leave"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
