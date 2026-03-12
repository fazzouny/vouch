/**
 * Audit and evidence layer: immutable event schema for request, decision, execution, approval, revocation.
 * Optional previousEventHash for tamper-evident chain.
 */

export type AuditEventType =
  | 'request'
  | 'policy_decision'
  | 'execution'
  | 'approval'
  | 'revocation';

/** Request payload: action request as received by the gateway */
export interface AuditRequestPayload {
  action: string;
  target?: string;
  scope?: unknown;
  taskId?: string;
  runId?: string;
  onBehalfOf?: string;
  /** Truncated or redacted summary of data touched */
  dataSummary?: string;
  justification?: string;
}

/** Policy decision payload: decision record snapshot */
export interface AuditDecisionPayload {
  decisionId: string;
  result: string;
  reason: string;
  conditions?: unknown;
}

/** Execution payload: summary of what was executed and result metadata */
export interface AuditExecutionPayload {
  grantId: string;
  action: string;
  target?: string;
  success: boolean;
  /** Optional cost or spend linkage */
  costRef?: string;
  /** Truncated response summary */
  responseSummary?: string;
}

/** Approval payload: request and/or decision */
export interface AuditApprovalPayload {
  approvalRequestId: string;
  action?: 'requested' | 'approved' | 'denied';
  approverId?: string;
  reason?: string;
}

/** Revocation payload */
export interface AuditRevocationPayload {
  revocationId: string;
  grantId?: string;
  reason?: string;
  revokedBy: string;
}

export type AuditEventPayload =
  | AuditRequestPayload
  | AuditDecisionPayload
  | AuditExecutionPayload
  | AuditApprovalPayload
  | AuditRevocationPayload;

export interface AuditEvent {
  /** Unique event id (e.g. ulid or uuid); alias for eventId when present */
  id?: string;
  /** Unique event id (e.g. ulid or uuid) */
  eventId: string;
  eventType: AuditEventType;
  /** ISO 8601 */
  timestamp: string;
  /** Actor that caused this event (agent id, user id, system) */
  actorId: string;
  /** Agent this event relates to (when applicable) */
  agentId?: string;
  taskId?: string;
  runId?: string;
  /** Policy decision id when event is policy_decision or links to one */
  policyDecisionId?: string;
  /** Type-specific payload (request/decision/execution summary) */
  payload: AuditEventPayload;
  /** Hash of previous event for tamper-evident chain (optional) */
  previousEventHash?: string;
  /** Optional retention or legal-hold metadata */
  retention?: {
    retainUntil?: string;
    legalHold?: boolean;
  };
}
