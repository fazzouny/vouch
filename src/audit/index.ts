/**
 * Audit layer stub: append-only events and query.
 */

import type { AuditEvent } from "../types.js";

const events: AuditEvent[] = [];

export async function appendEvent(event: Omit<AuditEvent, "eventId" | "timestamp">): Promise<void> {
  events.push({
    ...event,
    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  });
}

export async function queryEvents(filter: {
  agentId?: string;
  grantId?: string;
  type?: string;
  since?: string;
  limit?: number;
}): Promise<AuditEvent[]> {
  let result = [...events];
  if (filter.agentId) result = result.filter((e) => e.agentId === filter.agentId);
  if (filter.grantId) result = result.filter((e) => e.grantId === filter.grantId);
  if (filter.type) result = result.filter((e) => e.type === filter.type);
  if (filter.since) result = result.filter((e) => e.timestamp >= filter.since!);
  const limit = filter.limit ?? 100;
  return result.slice(-limit);
}
