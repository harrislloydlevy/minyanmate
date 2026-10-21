"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

/**
 * Copies the current page URL to the clipboard. Rendered for everyone
 * (guests included) so organisers and attendees can share the event link
 * without copy/pasting from the address bar.
 */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const copied = await copyToClipboard(window.location.href);
    if (!copied) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label="Copy link to share"
      title="Copy link to share"
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      <span className="hidden sm:inline">
        {copied ? "Link copied" : "Copy link to share"}
      </span>
    </Button>
  );
}
