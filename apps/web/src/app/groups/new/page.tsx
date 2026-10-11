import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GroupForm } from "@/components/group-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New group",
};

export default async function NewGroupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="container flex flex-1 items-start justify-center py-10">
        <div className="flex w-full max-w-lg flex-col gap-4">
          <Button asChild variant="ghost" className="w-fit -ml-2">
            <Link href="/my">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <GroupForm />
        </div>
      </main>
    </div>
  );
}
