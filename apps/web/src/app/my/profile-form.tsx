"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { displayName, isPhoneLikeName, needsName } from "@/lib/display-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  initialName: string;
}

/**
 * Inline welcome line: "Welcome, <name>" with a Change name action that swaps
 * the heading for a compact input and Save/Cancel buttons.
 */
export function ProfileForm({ initialName }: ProfileFormProps) {
  const router = useRouter();
  const [savedName, setSavedName] = useState(needsName(initialName) ? "" : initialName.trim());
  const [name, setName] = useState(needsName(initialName) ? "" : initialName.trim());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const shownName = displayName(savedName);
  const canSave = trimmedName.length > 0 && trimmedName !== savedName && !saving;

  function startEditing() {
    setName(savedName);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setName(savedName);
    setError(null);
    setEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    if (isPhoneLikeName(trimmedName)) {
      setError("Please enter a name, not a phone number.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await authClient.updateUser({ name: trimmedName });

    if (error) {
      setError(error.message ?? "Could not update your name. Please try again.");
      setSaving(false);
      return;
    }

    setSavedName(trimmedName);
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {shownName}</h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={startEditing}
          className="text-muted-foreground hover:text-foreground -ml-1 h-7 px-2 text-xs"
        >
          Change name
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="profile-name" className="sr-only">
          Name
        </Label>
        <Input
          id="profile-name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          maxLength={100}
          autoFocus
          required
          className="h-9 w-48 sm:w-56"
        />
        <Button type="submit" size="sm" disabled={!canSave}>
          {saving ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancelEditing} disabled={saving}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </form>
  );
}
