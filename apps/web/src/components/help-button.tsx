"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { getSetupContact, type SetupContactInfo } from "@/lib/actions/setup-contact";

function getContactLink(contact: NonNullable<SetupContactInfo>): string | null {
  if (contact.preferredContactMethod === "whatsapp" && contact.phoneNumber) {
    const number = contact.phoneNumber.replace(/[^+\d]/g, "");
    return `https://wa.me/${number.replace(/^\+/, "")}`;
  }
  if (contact.preferredContactMethod === "phone" && contact.phoneNumber) {
    const number = contact.phoneNumber.replace(/[^+\d]/g, "");
    return `tel:${number}`;
  }
  if (contact.preferredContactMethod === "email" && contact.email) {
    return `mailto:${contact.email}`;
  }
  // Fallback: try whatsapp first if phone exists
  if (contact.phoneNumber) {
    const number = contact.phoneNumber.replace(/[^+\d]/g, "");
    return `https://wa.me/${number.replace(/^\+/, "")}`;
  }
  if (contact.email) {
    return `mailto:${contact.email}`;
  }
  return null;
}

export function HelpButton() {
  const [contact, setContact] = useState<SetupContactInfo>(null);

  useEffect(() => {
    getSetupContact().then(setContact);
  }, []);

  if (!contact) return null;

  const link = getContactLink(contact);
  if (!link) return null;

  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <a href={link} target="_blank" rel="noopener noreferrer">
        <HelpCircle className="size-4" />
        Help
      </a>
    </Button>
  );
}
