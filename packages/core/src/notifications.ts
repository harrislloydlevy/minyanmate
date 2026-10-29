/** Pure helpers for quorum / capacity-reached push notifications. */

export interface QuorumNotificationEvent {
  id: string;
  title?: string | null;
  name?: string | null;
  startsAt?: string | null;
  date?: string | null;
  time?: string | null;
  locationText?: string | null;
  location?: string | null;
  quorumTarget?: number | null;
}

export interface QuorumNotification {
  eventId: string;
  eventName: string;
  eventTime: string;
  eventLocation: string;
  confirmationCount: number;
  confirmedCount: number;
  count: number;
  target: number;
  deepLink: string;
  url: string;
  link: string;
  title: string;
  body: string;
  message: string;
}

export interface QuorumNotificationRecipient {
  userId: string;
  status: "in" | "maybe" | "out";
  notifyQuorum?: boolean | null;
  notify_quorum?: boolean | null;
}

export function eventDeepLink(eventId: string): string {
  return `/events/${eventId}`;
}

export function deepLinkToEvent(eventId: string): string {
  return eventDeepLink(eventId);
}

export function eventPageUrl(eventId: string, baseUrl?: string): string {
  const path = eventDeepLink(eventId);
  if (!baseUrl) return path;
  return `${String(baseUrl).replace(/\/$/, "")}${path}`;
}

export function eventPageLink(eventId: string, baseUrl?: string): string {
  return eventPageUrl(eventId, baseUrl);
}

export function quorumReachedDedupeKey(eventId: string): string {
  return `quorum_reached:${eventId}`;
}

export function capacityReachedDedupeKey(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function quorumMilestoneDedupeKey(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function dedupeKeyForQuorum(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function dedupeKeyForCapacity(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function quorumNotificationDedupeKey(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function milestoneDedupeKey(eventId: string): string {
  return quorumReachedDedupeKey(eventId);
}

export function isQuorumReached(count: number, target: number): boolean {
  const t = target ?? 0;
  return t <= 0 ? true : (count ?? 0) >= t;
}

export function hasReachedQuorum(count: number, target: number): boolean {
  return isQuorumReached(count, target);
}

export function isCapacityReached(count: number, target: number): boolean {
  return isQuorumReached(count, target);
}

export function hasReachedCapacity(count: number, target: number): boolean {
  return isQuorumReached(count, target);
}

export function isMilestoneReached(count: number, target: number): boolean {
  return isQuorumReached(count, target);
}

export function shouldNotifyQuorum(
  beforeCount: number,
  afterCount: number,
  target: number,
): boolean {
  const t = target ?? 0;
  const beforeReached = t <= 0 ? true : (beforeCount ?? 0) >= t;
  const afterReached = t <= 0 ? true : (afterCount ?? 0) >= t;
  return !beforeReached && afterReached;
}

export function shouldSendQuorumNotification(
  beforeCount: number,
  afterCount: number,
  target: number,
): boolean {
  return shouldNotifyQuorum(beforeCount, afterCount, target);
}

export function shouldNotifyCapacity(
  beforeCount: number,
  afterCount: number,
  target: number,
): boolean {
  return shouldNotifyQuorum(beforeCount, afterCount, target);
}

export function shouldSendCapacityNotification(
  beforeCount: number,
  afterCount: number,
  target: number,
): boolean {
  return shouldNotifyQuorum(beforeCount, afterCount, target);
}

export function quorumJustReached(
  beforeCount: number,
  afterCount: number,
  target: number,
): boolean {
  return shouldNotifyQuorum(beforeCount, afterCount, target);
}

export function isQuorumNotificationEnabled(
  pref?: { notifyQuorum?: boolean | null; notify_quorum?: boolean | null } | null,
): boolean {
  if (!pref) return true;
  if (pref.notifyQuorum != null) return pref.notifyQuorum !== false;
  if (pref.notify_quorum != null) return pref.notify_quorum !== false;
  return true;
}

export function respectsNotificationPreference(
  pref?: { notifyQuorum?: boolean | null; notify_quorum?: boolean | null } | null,
): boolean {
  return isQuorumNotificationEnabled(pref);
}

export function shouldNotifyUser(
  pref?: { notifyQuorum?: boolean | null; notify_quorum?: boolean | null } | null,
): boolean {
  return isQuorumNotificationEnabled(pref);
}

export function filterQuorumNotificationRecipients<T extends QuorumNotificationRecipient>(
  recipients: readonly T[],
): T[] {
  return recipients.filter((r) => {
    const pref = {
      notifyQuorum: r.notifyQuorum ?? r.notify_quorum ?? null,
    };
    return isQuorumNotificationEnabled(pref);
  });
}

export function filterNotifiableAttendees<T extends QuorumNotificationRecipient>(
  recipients: readonly T[],
): T[] {
  return filterQuorumNotificationRecipients(recipients);
}

export function filterNotificationRecipients<T extends QuorumNotificationRecipient>(
  recipients: readonly T[],
): T[] {
  return filterQuorumNotificationRecipients(recipients);
}

export function buildQuorumNotification(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  const t = target ?? event.quorumTarget ?? 0;
  const name = event.title ?? event.name ?? "Event";
  const time = event.startsAt ?? event.time ?? "";
  const location = event.locationText ?? event.location ?? "";
  const eventId = event.id;
  const deepLink = eventDeepLink(eventId);
  const body = `${name} has reached quorum — ${confirmedCount} confirmed`;
  return {
    eventId,
    eventName: name,
    eventTime: time,
    eventLocation: location,
    confirmationCount: confirmedCount,
    confirmedCount,
    count: confirmedCount,
    target: t,
    deepLink,
    url: deepLink,
    link: deepLink,
    title: "Quorum reached",
    body,
    message: `${name} at ${time} — ${location} (${confirmedCount} confirmed) ${deepLink}`,
  };
}

export function createQuorumNotification(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  return buildQuorumNotification(event, confirmedCount, target);
}

export function formatQuorumNotification(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  return buildQuorumNotification(event, confirmedCount, target);
}

export function quorumNotificationContent(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  return buildQuorumNotification(event, confirmedCount, target);
}

export function capacityNotificationContent(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  const n = buildQuorumNotification(event, confirmedCount, target);
  return { ...n, title: "Capacity reached" };
}

export function buildCapacityNotification(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  return capacityNotificationContent(event, confirmedCount, target);
}

export function formatCapacityNotification(
  event: QuorumNotificationEvent,
  confirmedCount: number,
  target?: number,
): QuorumNotification {
  return capacityNotificationContent(event, confirmedCount, target);
}

export const quorumNotification = buildQuorumNotification;
export const notificationForQuorum = buildQuorumNotification;
export const buildNotification = buildQuorumNotification;
export const createNotification = buildQuorumNotification;
export const formatNotification = buildQuorumNotification;

export const reachedDedupeKey = quorumReachedDedupeKey;
export const quorumDedupeKey = quorumReachedDedupeKey;
export const capacityDedupeKey = capacityReachedDedupeKey;

export const isReached = isQuorumReached;
export const reached = isQuorumReached;