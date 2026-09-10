import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-lg font-bold tracking-tight">
        Minyan<span className="text-primary">Mate</span>
      </Link>
      <LoginForm />
      <Button asChild variant="ghost" size="sm">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
