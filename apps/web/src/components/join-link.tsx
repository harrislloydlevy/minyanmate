"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateJoinToken } from "@/lib/actions/group-members";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

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
      setCopied(false);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  async function handleCopy() {
    if (!url) return;
    setError(null);
    const copied = await copyToClipboard(url);
    if (copied) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
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
          <div className="flex flex-col items-start gap-1.5">
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
              Regenerate and revoke
            </Button>
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Old invite links will stop working as soon as you regenerate.
            </p>
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
