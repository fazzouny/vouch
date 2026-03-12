/**
 * @vouch/gateway
 * Identity, delegation layer, and gateway surface.
 */

export { IdentityStore } from './identity/store.js';
export { resolveCallerIdentity } from './identity/auth.js';
export type {
  ResolvedIdentityContext,
  ResolveCallerIdentityOutcome,
  IncomingRequestLike,
} from './identity/index.js';

export { appendEvent, queryEvents, createAuditLog, setDefaultAuditLog } from './audit/index.js';
export type { AuditLogOptions, AuditQueryFilter } from './audit/types.js';

export { ApprovalStore } from './approval/index.js';
export type { CreateApprovalRequestInput } from './approval/index.js';

export { BudgetStore } from './budget/index.js';
export type { CreateBudgetInput } from './budget/index.js';

export { TrustStore } from './trust/index.js';

export {
  evaluatePolicy,
  mintGrant,
  verifyGrant,
  revokeGrant,
  revokeGrantsByAgent,
  revokeGrantsByAgentList,
  registerGrant,
  isRevoked,
  clearRevocations,
  signGrant,
  verifySignature,
  defaultExpiresAt,
} from './delegation/index.js';

export type {
  AgentIdentity,
  MintGrantInput,
  MintGrantResult,
  MintGrantSuccess,
  MintGrantDenial,
  VerifyGrantResult,
  VerifyGrantOptions,
  SigningOptions,
} from './delegation/index.js';
