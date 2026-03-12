/**
 * @delegation-gatekeeper/types
 * Shared TypeScript types and schemas for the Delegation Gatekeeper monorepo.
 * Use for identity, grants, policy decisions, and audit events across gateway, policy-engine, adapters, and sdk.
 */

export type {
  Organization,
  Workspace,
  User,
  ServiceAccount,
  Agent,
  AgentRuntime,
  TrustLevel,
  AgentStatus,
} from './identity';

export type {
  GrantScope,
  GrantPayload,
  SignedGrant,
} from './grant';

export type {
  PolicyDecisionResult,
  PolicyConditions,
  PolicyDecision,
} from './policy-decision';

export type { ActionRequest } from './action-request';

export type {
  AuditEventType,
  AuditRequestPayload,
  AuditDecisionPayload,
  AuditExecutionPayload,
  AuditApprovalPayload,
  AuditRevocationPayload,
  AuditEventPayload,
  AuditEvent,
} from './audit-event';

export type {
  ApprovalStatus,
  ApprovalType,
  ApprovalRequest,
  ApprovalDecision,
} from './approval';

export type {
  BudgetScope,
  Budget,
  SpendRecord,
} from './budget';

export type {
  TrustTier,
  TrustSignalType,
  TrustSignal,
  TrustScore,
} from './trust';
