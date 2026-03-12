/**
 * Identity layer types: organizations, workspaces, users, service accounts, agents, and runtimes.
 * Used for auth resolution, agent registration, and on-behalf-of constraints.
 */

/** Tenant and grouping root */
export interface Organization {
  id: string;
  displayName: string;
  /** Optional external IdP tenant id (e.g. Entra, Okta) */
  externalId?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/** Scoped grouping under an org (team, project, department) */
export interface Workspace {
  id: string;
  orgId: string;
  displayName: string;
  /** Optional parent workspace id */
  parentId?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

/** Human user identity; may be linked to OIDC/OAuth */
export interface User {
  id: string;
  orgId: string;
  workspaceIds: string[];
  displayName: string;
  email?: string;
  /** External IdP subject or email */
  externalId?: string;
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  updatedAt: string;
}

/** Machine or integration identity (CI, scripts, external systems) */
export interface ServiceAccount {
  id: string;
  orgId: string;
  workspaceIds: string[];
  displayName: string;
  /** Optional client_id or app id from IdP */
  externalId?: string;
  status: 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

/** Agent identity: approved tools, default trust level, on-behalf-of constraints */
export interface Agent {
  id: string;
  orgId: string;
  workspaceId: string;
  displayName: string;
  /** Tool identifiers this agent is allowed to use (e.g. mcp:my-server, api:stripe) */
  approvedTools: string[];
  /** Default trust tier used by policy when not overridden */
  defaultTrustLevel: TrustLevel;
  status: AgentStatus;
  /** Allowed "on-behalf-of" scope: user ids, role names, or department ids */
  onBehalfOfScope?: string[];
  /** Optional constraints (e.g. task type Z only) */
  constraints?: Record<string, unknown>;
  /** Revocation id if agent credentials have been revoked */
  revocationId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TrustLevel = 'low' | 'medium' | 'high' | 'elevated';

export type AgentStatus = 'active' | 'suspended' | 'pending_approval' | 'revoked';

/** Runtime instance (e.g. OpenAI/LangGraph); attests as an agent and receives grants */
export interface AgentRuntime {
  id: string;
  agentId: string;
  orgId: string;
  displayName: string;
  /** Framework or runtime type (e.g. openai, langgraph, custom) */
  framework?: string;
  /** Tool identifiers this runtime is allowed to use (subset of agent's approvedTools) */
  approvedTools: string[];
  defaultTrustLevel: TrustLevel;
  status: 'active' | 'suspended' | 'revoked';
  /** Optional revocation id for this runtime's credentials */
  revocationId?: string;
  createdAt: string;
  updatedAt: string;
}
