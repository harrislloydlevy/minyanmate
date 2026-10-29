"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { isPhoneLikeName } from "@/lib/display-name";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NameFormProps {
  next: string;
}

export function NameForm({ next }: NameFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a name.");
      return;
    }
    if (isPhoneLikeName(trimmedName)) {
      setError("Please enter a name, not a phone number.");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await authClient.updateUser({
      name: trimmedName,
    });

    if (updateError) {
      setError(updateError.message ?? "Could not save your name. Please try again.");
      setSaving(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome to MinyanMate</CardTitle>
        <CardDescription>
          What should we call you? This is how you&apos;ll appear to other people in your minyans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Your name</Label>
            <Input
              id="display-name"
              name="name"
              type="text"
              autoComplete="name"
              autoFocus
              maxLength={100}
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            Use a different number
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
