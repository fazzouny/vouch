/**
 * Identity layer request/context types used by the gateway.
 * Entity types come from @delegation-gatekeeper/types.
 */
import type { Agent, User, TrustLevel } from '@delegation-gatekeeper/types';

/** Minimal request shape for auth: API key or JWT in headers */
export interface IncomingRequestLike {
  headers?: {
    authorization?: string;
    'x-api-key'?: string;
    'x-agent-id'?: string;
    'x-on-behalf-of'?: string;
  };
}

/** Resolved caller: either an agent (runtime) or a user/service account */
export type CallerIdentity =
  | { kind: 'agent'; agent: Agent; runtimeId?: string }
  | { kind: 'user'; userId: string; orgId: string; displayName?: string }
  | { kind: 'service'; serviceAccountId: string; orgId: string; displayName?: string };

/** Optional on-behalf-of: user or role the caller is acting for */
export interface OnBehalfOf {
  /** User id, role name, or department/workspace id */
  subject: string;
  type: 'user' | 'role' | 'department';
}

/** Context attached to a request after identity resolution */
export interface ResolvedIdentityContext {
  /** Agent id if caller is an agent; undefined for user/service */
  agentId?: string;
  /** User id if caller is a user */
  userId?: string;
  /** Service account id if caller is a service account */
  serviceAccountId?: string;
  /** Organization id (always set when resolved) */
  orgId: string;
  /** Workspace id when applicable (e.g. agent's workspace) */
  workspaceId?: string;
  /** Optional on-behalf-of user/role */
  onBehalfOf?: OnBehalfOf;
  /** Resolved trust level (e.g. from agent defaultTrustLevel) */
  trustLevel?: TrustLevel;
  /** Full identity for policy/audit */
  identity: CallerIdentity;
}
