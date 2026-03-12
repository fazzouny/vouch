/**
 * Audit layer query and options.
 * Event shape from @vouch/types.
 */
import type { AuditEvent, AuditEventType } from '@vouch/types';

/** Filter for querying audit events */
export interface AuditQueryFilter {
  agentId?: string;
  taskId?: string;
  runId?: string;
  /** Filter by event type (request, policy_decision, execution, approval, revocation) */
  actionType?: AuditEventType;
  startTime?: string; // ISO 8601
  endTime?: string;   // ISO 8601
}

/** Options for the audit log store */
export interface AuditLogOptions {
  /** Path to JSONL file; if omitted, uses in-memory store (Phase 1) */
  filePath?: string;
  /** When true, compute and set previousEventHash from the previous event for tamper evidence */
  computeHashChain?: boolean;
}

export type { AuditEvent, AuditEventType };
