"use client";

import { UsersRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { createGroup, type CreateGroupResult } from "@/lib/actions/create-group";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GroupForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateGroupResult | null, FormData>(
    createGroup,
    null
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/groups/${state.slug}`);
    }
  }, [state?.success, state, router]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-xl">
          <UsersRound className="size-6" />
        </div>
        <CardTitle className="text-xl">New group</CardTitle>
        <CardDescription>
          Create a minyan or pickup group.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Shul on Main"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="typeTag">Type</Label>
            <select
              id="typeTag"
              name="typeTag"
              required
              data-slot="input"
              className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
            >
              <option value="" disabled>
                Select a type
              </option>
              <option value="minyan">Minyan</option>
              <option value="pickup">Pickup</option>
              <option value="both">Minyan &amp; pickup</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="defaultLocation">
              Default location <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="defaultLocation"
              name="defaultLocation"
              type="text"
              placeholder="123 Main St, room 2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="description"
              name="description"
              type="text"
              placeholder="The main shul on Main street"
            />
          </div>

          {state && !state.success && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UsersRound className="size-4" />
            )}
            {pending ? "Creating…" : "Create group"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}