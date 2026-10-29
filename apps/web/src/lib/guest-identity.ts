import type { RsvpStatus } from "@/lib/actions/rsvp";

/** Fired when a guest picks their name from the RSVP list ("This is me"). */
export const GUEST_NAME_SELECTED_EVENT = "minyanmate:guest-name-selected";

export type GuestNameSelectedDetail = {
  name: string;
  status?: RsvpStatus;
};
