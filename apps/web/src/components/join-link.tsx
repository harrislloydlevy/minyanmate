"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateJoinToken,
  revokeJoinToken,
} from "@/lib/actions/group-members";

interface JoinLinkProps {
  slug: string;
  initialToken: string | null;
}

export function JoinLink({ slug, initialToken }: JoinLinkProps) {
  const [token, setToken] = useState(initialToken);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = token && origin ? `${origin}/groups/${slug}?join=${token}` : null;

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    const result = await generateJoinToken(slug);
    if (result.success) {
      setToken(result.token);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  async function handleRevoke() {
    setBusy(true);
    setError(null);
    const result = await revokeJoinToken(slug);
    if (result.success) {
      setToken(null);
      setCopied(false);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy the link. Select it and copy manually.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {url ? (
        <>
          <div className="flex gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={busy}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              Regenerate
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRevoke}
              disabled={busy}
            >
              <Trash2 className="size-4" />
              Revoke
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={busy}
          className="self-start"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Generate invite link
        </Button>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
