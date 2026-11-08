"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { MESSAGE_CHANNELS, type MessageChannel } from "@minyanmate/core";
import { Button } from "@/components/ui/button";
import { recordManualSend } from "@/lib/actions/messages";

const SUGGESTED_TECHNIQUES = [
  "manual",
  "console",
  "whatsapp:text",
  "whatsapp:template",
  "sms:text",
  "email:text",
];

interface ManualDeliveryFormProps {
  messageId: string;
  defaultChannel: MessageChannel;
  defaultRecipient: string | null;
  defaultBody: string | null;
}

export function ManualDeliveryForm({
  messageId,
  defaultChannel,
  defaultRecipient,
  defaultBody,
}: ManualDeliveryFormProps) {
  const router = useRouter();
  const [technique, setTechnique] = useState(
    defaultChannel === "console" ? "console" : `${defaultChannel}:text`,
  );
  const [sentChannel, setSentChannel] = useState<MessageChannel>(defaultChannel);
  const [sentRecipient, setSentRecipient] = useState(defaultRecipient ?? "");
  const [sentBody, setSentBody] = useState(defaultBody ?? "");
  const [providerMessageId, setProviderMessageId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const techniqueListId = `message-techniques-${messageId}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const result = await recordManualSend({
      messageId,
      technique,
      sentChannel,
      sentRecipient,
      sentBody,
      providerMessageId,
    });

    if (!result.success) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Technique
          <input
            value={technique}
            onChange={(event) => setTechnique(event.target.value)}
            list={techniqueListId}
            placeholder="whatsapp:template"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            required
          />
          <datalist id={techniqueListId}>
            {SUGGESTED_TECHNIQUES.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium">
          Sent channel
          <select
            value={sentChannel}
            onChange={(event) => setSentChannel(event.target.value as MessageChannel)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {MESSAGE_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Sent recipient
        <input
          value={sentRecipient}
          onChange={(event) => setSentRecipient(event.target.value)}
          placeholder="Leave blank to reuse the requested recipient"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Sent body
        <textarea
          value={sentBody}
          onChange={(event) => setSentBody(event.target.value)}
          rows={4}
          placeholder="Leave blank to reuse the requested body"
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Provider message id (optional)
        <input
          value={providerMessageId}
          onChange={(event) => setProviderMessageId(event.target.value)}
          placeholder="e.g. wamid.…"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" />
          )}
          Record manual send
        </Button>
        {saved && <span className="text-xs text-green-700 dark:text-green-400">Recorded.</span>}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
