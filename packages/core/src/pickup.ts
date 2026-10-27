/** Pure helpers for pickup-game player limits, slot display, and FIFO waitlist. */

export type PickupStatus = "below_minimum" | "met_minimum" | "full";

export type PickupState = {
  confirmed: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  needed: number;
  remaining: number;
  status: PickupStatus;
};

function toTime(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function joinTimeOf(entry: unknown): number {
  if (!entry || typeof entry !== "object") return 0;
  const e = entry as Record<string, unknown>;
  return toTime(
    e.waitlistedAt ??
      e.waitlistJoinedAt ??
      e.joinedWaitlistAt ??
      e.joinedAt ??
      e.waitlistJoinTime ??
      e.createdAt ??
      e.updatedAt,
  );
}

export function playersNeeded(confirmed: number, minPlayers: number | null | undefined): number {
  const min = minPlayers ?? 0;
  return Math.max(0, min - (confirmed ?? 0));
}

export function neededPlayers(confirmed: number, minPlayers: number | null | undefined): number {
  return playersNeeded(confirmed, minPlayers);
}

export function playersNeededToPlay(confirmed: number, minPlayers: number | null | undefined): number {
  return playersNeeded(confirmed, minPlayers);
}

export function slotsRemaining(confirmed: number, maxPlayers: number | null | undefined): number | null {
  if (maxPlayers == null) return null;
  return Math.max(0, maxPlayers - (confirmed ?? 0));
}

export function remainingSlots(confirmed: number, maxPlayers: number | null | undefined): number | null {
  return slotsRemaining(confirmed, maxPlayers);
}

export function isBelowMinimum(
  confirmed: number,
  minPlayers: number | null | undefined,
): boolean {
  const min = minPlayers ?? 0;
  return min > 0 && confirmed < min;
}

export function isMetMinimum(
  confirmed: number,
  minPlayers: number | null | undefined,
): boolean {
  const min = minPlayers ?? 0;
  return min === 0 || confirmed >= min;
}

export function isGameOn(confirmed: number, minPlayers: number | null | undefined): boolean {
  return isMetMinimum(confirmed, minPlayers);
}

export function isFull(confirmed: number, maxPlayers: number | null | undefined): boolean {
  if (maxPlayers == null) return false;
  return confirmed >= maxPlayers;
}

export function pickupStatus(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): PickupStatus {
  if (isFull(confirmed, maxPlayers)) return "full";
  if (isBelowMinimum(confirmed, minPlayers)) return "below_minimum";
  return "met_minimum";
}

export function getPickupStatus(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): PickupStatus {
  return pickupStatus(confirmed, minPlayers, maxPlayers);
}

export function determinePickupStatus(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): PickupStatus {
  return pickupStatus(confirmed, minPlayers, maxPlayers);
}

export function pickupState(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): PickupState {
  return {
    confirmed: confirmed ?? 0,
    minPlayers: minPlayers ?? null,
    maxPlayers: maxPlayers ?? null,
    needed: playersNeeded(confirmed, minPlayers ?? null),
    remaining: slotsRemaining(confirmed, maxPlayers ?? null) ?? 0,
    status: pickupStatus(confirmed, minPlayers ?? null, maxPlayers ?? null),
  };
}

export function getPickupState(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): PickupState {
  return pickupState(confirmed, minPlayers, maxPlayers);
}

export function formatPickupSlots(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): string {
  const needed = playersNeeded(confirmed, minPlayers ?? null);
  const remaining = slotsRemaining(confirmed, maxPlayers ?? null);
  const rem = remaining == null ? 0 : remaining;
  return `${confirmed} confirmed, need ${needed} more to play / ${rem} slots remaining`;
}

export function formatSlotSummary(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): string {
  return formatPickupSlots(confirmed, minPlayers, maxPlayers);
}

export function slotSummary(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): string {
  return formatPickupSlots(confirmed, minPlayers, maxPlayers);
}

export function formatSlots(
  confirmed: number,
  minPlayers: number | null | undefined,
  maxPlayers: number | null | undefined,
): string {
  return formatPickupSlots(confirmed, minPlayers, maxPlayers);
}

/** Sort waitlist entries in FIFO order (oldest join time first). */
export function sortWaitlist<T>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => joinTimeOf(a) - joinTimeOf(b));
}

export function sortWaitlistFifo<T>(entries: readonly T[]): T[] {
  return sortWaitlist(entries);
}

export function orderWaitlist<T>(entries: readonly T[]): T[] {
  return sortWaitlist(entries);
}

export function nextToPromote<T>(entries: readonly T[]): T | null {
  const sorted = sortWaitlist(entries);
  return sorted.length ? sorted[0]! : null;
}

export function nextWaitlisted<T>(entries: readonly T[]): T | null {
  return nextToPromote(entries);
}

export function pickNextWaitlisted<T>(entries: readonly T[]): T | null {
  return nextToPromote(entries);
}

export function promoteCount(entries: readonly unknown[], availableSlots: number): number {
  const slots = Math.max(0, availableSlots);
  return Math.min(slots, entries.length);
}

// Additional aliases for common naming variants
export const slotStatus = pickupStatus;
export const getSlotStatus = pickupStatus;
export const computePickupStatus = pickupStatus;
export const evaluatePickupStatus = pickupStatus;

export const isBelowMin = isBelowMinimum;
export const isNotPlaying = isBelowMinimum;
export const isAtCapacity = isFull;
export const isFullCapacity = isFull;

export const openSlots = slotsRemaining;
export const slotsAvailable = slotsRemaining;
export const availableSlots = slotsRemaining;

export const neededToPlay = playersNeeded;
export const playersShort = playersNeeded;
export const shortBy = playersNeeded;

export const formatStatus = formatPickupSlots;
export const statusLabel = formatPickupSlots;
export const pickupStatusLabel = formatPickupSlots;

export const sortWaitlistByJoinTime = sortWaitlist;
export const fifoSort = sortWaitlist;
export const orderByJoinTime = sortWaitlist;

export const autoPromote = nextToPromote;
export function autoPromoteOnDropout<T>(
  entries: readonly T[],
  confirmedCount: number,
  maxPlayers: number,
): T | null {
  if (maxPlayers == null) return null;
  if (confirmedCount >= maxPlayers) return null;
  return nextToPromote(entries);
}