"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  initialName: string;
  phoneNumber: string | null;
}

export function ProfileForm({ initialName, phoneNumber }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && trimmedName !== initialName && !saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error } = await authClient.updateUser({ name: trimmedName });

    if (error) {
      setError(error.message ?? "Could not update your name. Please try again.");
    } else {
      setSuccess("Name updated");
      router.refresh();
    }

    setSaving(false);
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Your details</CardTitle>
        <CardDescription>Your name appears on every event you have RSVP&apos;d to.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                maxLength={100}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Phone number</span>
              <p className="flex h-9 items-center text-sm">{phoneNumber ?? "Not set"}</p>
              <p className="text-muted-foreground text-xs">
                Used to sign in and cannot be changed.
              </p>
            </div>
          </div>

          {success && (
            <p role="status" className="text-sm text-green-600 dark:text-green-400">
              {success}
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={!canSave} className="self-start">
            {saving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save name"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
