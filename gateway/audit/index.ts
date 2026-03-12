/**
 * Audit and evidence layer (Phase 1.4).
 * Append-only log, optional hash chain, write and query API.
 */
import type { AuditEvent } from '@vouch/types';
import { AuditLog } from './log.js';
import type { AuditLogOptions, AuditQueryFilter } from './types.js';

export { AuditLog } from './log.js';
export type { AuditEvent, AuditQueryFilter, AuditLogOptions } from './types.js';

/** Default log instance (in-memory when no filePath set); set via setDefaultAuditLog for file-backed. */
let defaultLog: AuditLog = new AuditLog({ computeHashChain: true });

/** Set the default audit log (e.g. file-backed). */
export function setDefaultAuditLog(log: AuditLog): void {
  defaultLog = log;
}

/** Append an event to the default audit log. Optionally computes previousEventHash from previous event. */
export function appendEvent(event: AuditEvent): void {
  defaultLog.appendEvent(event);
}

/** Query events from the default audit log. */
export function queryEvents(filter: AuditQueryFilter): AuditEvent[] {
  return defaultLog.queryEvents(filter);
}

/** Create an audit log with file path or in-memory (no filePath). */
export function createAuditLog(options?: AuditLogOptions): AuditLog {
  return new AuditLog(options);
}
