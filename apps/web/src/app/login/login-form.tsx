"use client";

import { MessageCircle, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
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

type Step = "phone" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Could not send the code. Try again.");
      return;
    }
    setStep("code");
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.phoneNumber.verify({ phoneNumber, code });
    setLoading(false);
    if (error) {
      setError(error.message ?? "That code didn't work. Try again.");
      return;
    }
    router.push("/my");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-xl">
          <MessageCircle className="size-6" />
        </div>
        <CardTitle className="text-xl">Sign in with WhatsApp</CardTitle>
        <CardDescription>
          {step === "phone"
            ? "We'll text you a one-time code."
            : `Enter the code we sent to ${phoneNumber}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+972 50 123 4567"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>
              <Smartphone className="size-4" />
              {loading ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Verify and sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            >
              Change number
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
