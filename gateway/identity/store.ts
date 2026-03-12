/**
 * In-memory identity store — Phase 1.
 * Schema and API are ready for a Postgres-backed implementation later.
 */
import type {
  Organization,
  Workspace,
  User,
  ServiceAccount,
  Agent,
  AgentRuntime,
} from '@delegation-gatekeeper/types';

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface IdentityStoreConfig {
  /** Optional; for future Postgres adapter */
  connectionString?: string;
}

/**
 * In-memory identity store. All entities keyed by id; indexes for org, workspace, agent.
 */
export class IdentityStore {
  private readonly orgs = new Map<string, Organization>();
  private readonly workspaces = new Map<string, Workspace>();
  private readonly users = new Map<string, User>();
  private readonly serviceAccounts = new Map<string, ServiceAccount>();
  private readonly agents = new Map<string, Agent>();
  private readonly agentRuntimes = new Map<string, AgentRuntime>();
  /** API key or token -> agent id (for auth resolution) */
  private readonly apiKeyToAgentId = new Map<string, string>();
  /** API key -> user id */
  private readonly apiKeyToUserId = new Map<string, string>();
  /** API key -> service account id */
  private readonly apiKeyToServiceId = new Map<string, string>();
  /** JWT subject or opaque token -> agent id (placeholder for real JWT verification) */
  private readonly tokenToAgentId = new Map<string, string>();

  constructor(_config?: IdentityStoreConfig) {}

  // ——— Organizations ———
  async createOrganization(input: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const id = newId('org');
    const ts = now();
    const org: Organization = {
      id,
      displayName: input.displayName,
      externalId: input.externalId,
      status: input.status,
      createdAt: ts,
      updatedAt: ts,
    };
    this.orgs.set(id, org);
    return org;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.orgs.get(id) ?? null;
  }

  async listOrganizations(): Promise<Organization[]> {
    return Array.from(this.orgs.values());
  }

  async updateOrganization(id: string, patch: Partial<Pick<Organization, 'displayName' | 'status' | 'externalId'>>): Promise<Organization | null> {
    const org = this.orgs.get(id);
    if (!org) return null;
    const updated: Organization = { ...org, ...patch, updatedAt: now() };
    this.orgs.set(id, updated);
    return updated;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    return this.orgs.delete(id);
  }

  // ——— Workspaces ———
  async createWorkspace(input: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const id = newId('ws');
    const ts = now();
    const ws: Workspace = {
      id,
      orgId: input.orgId,
      displayName: input.displayName,
      parentId: input.parentId,
      status: input.status,
      createdAt: ts,
      updatedAt: ts,
    };
    this.workspaces.set(id, ws);
    return ws;
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }

  async listWorkspacesByOrg(orgId: string): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).filter((w) => w.orgId === orgId);
  }

  async updateWorkspace(id: string, patch: Partial<Pick<Workspace, 'displayName' | 'status' | 'parentId'>>): Promise<Workspace | null> {
    const ws = this.workspaces.get(id);
    if (!ws) return null;
    const updated: Workspace = { ...ws, ...patch, updatedAt: now() };
    this.workspaces.set(id, updated);
    return updated;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    return this.workspaces.delete(id);
  }

  // ——— Users ———
  async createUser(input: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = newId('user');
    const ts = now();
    const user: User = {
      id,
      orgId: input.orgId,
      workspaceIds: input.workspaceIds ?? [],
      displayName: input.displayName,
      email: input.email,
      externalId: input.externalId,
      status: input.status,
      createdAt: ts,
      updatedAt: ts,
    };
    this.users.set(id, user);
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async listUsersByOrg(orgId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.orgId === orgId);
  }

  async updateUser(id: string, patch: Partial<Pick<User, 'displayName' | 'email' | 'workspaceIds' | 'status' | 'externalId'>>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: User = { ...user, ...patch, updatedAt: now() };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // ——— Service accounts ———
  async createServiceAccount(input: Omit<ServiceAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceAccount> {
    const id = newId('sa');
    const ts = now();
    const sa: ServiceAccount = {
      id,
      orgId: input.orgId,
      workspaceIds: input.workspaceIds ?? [],
      displayName: input.displayName,
      externalId: input.externalId,
      status: input.status,
      createdAt: ts,
      updatedAt: ts,
    };
    this.serviceAccounts.set(id, sa);
    return sa;
  }

  async getServiceAccount(id: string): Promise<ServiceAccount | null> {
    return this.serviceAccounts.get(id) ?? null;
  }

  async listServiceAccountsByOrg(orgId: string): Promise<ServiceAccount[]> {
    return Array.from(this.serviceAccounts.values()).filter((s) => s.orgId === orgId);
  }

  async updateServiceAccount(id: string, patch: Partial<Pick<ServiceAccount, 'displayName' | 'workspaceIds' | 'status' | 'externalId'>>): Promise<ServiceAccount | null> {
    const sa = this.serviceAccounts.get(id);
    if (!sa) return null;
    const updated: ServiceAccount = { ...sa, ...patch, updatedAt: now() };
    this.serviceAccounts.set(id, updated);
    return updated;
  }

  async deleteServiceAccount(id: string): Promise<boolean> {
    return this.serviceAccounts.delete(id);
  }

  // ——— Agents ———
  async registerAgent(input: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    const id = newId('agent');
    const ts = now();
    const agent: Agent = {
      id,
      orgId: input.orgId,
      workspaceId: input.workspaceId,
      displayName: input.displayName,
      approvedTools: input.approvedTools ?? [],
      defaultTrustLevel: input.defaultTrustLevel,
      status: input.status,
      onBehalfOfScope: input.onBehalfOfScope,
      constraints: input.constraints,
      revocationId: input.revocationId,
      createdAt: ts,
      updatedAt: ts,
    };
    this.agents.set(id, agent);
    return agent;
  }

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.get(id) ?? null;
  }

  async listAgentsByOrg(orgId: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter((a) => a.orgId === orgId);
  }

  async listAgentsByWorkspace(workspaceId: string): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter((a) => a.workspaceId === workspaceId);
  }

  async updateAgent(id: string, patch: Partial<Pick<Agent, 'displayName' | 'approvedTools' | 'defaultTrustLevel' | 'status' | 'onBehalfOfScope' | 'constraints' | 'revocationId'>>): Promise<Agent | null> {
    const agent = this.agents.get(id);
    if (!agent) return null;
    const updated: Agent = { ...agent, ...patch, updatedAt: now() };
    this.agents.set(id, updated);
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.agents.delete(id);
  }

  /** Bind an API key to an agent for auth resolution */
  async bindApiKeyToAgent(apiKey: string, agentId: string): Promise<void> {
    this.apiKeyToAgentId.set(apiKey, agentId);
  }

  async bindApiKeyToUser(apiKey: string, userId: string): Promise<void> {
    this.apiKeyToUserId.set(apiKey, userId);
  }

  async bindApiKeyToServiceAccount(apiKey: string, serviceAccountId: string): Promise<void> {
    this.apiKeyToServiceId.set(apiKey, serviceAccountId);
  }

  /** Resolve API key to agent id (for auth) */
  async resolveAgentIdByApiKey(apiKey: string): Promise<string | null> {
    return this.apiKeyToAgentId.get(apiKey) ?? null;
  }

  async resolveUserIdByApiKey(apiKey: string): Promise<string | null> {
    return this.apiKeyToUserId.get(apiKey) ?? null;
  }

  async resolveServiceAccountIdByApiKey(apiKey: string): Promise<string | null> {
    return this.apiKeyToServiceId.get(apiKey) ?? null;
  }

  /** Optional: bind Bearer token (e.g. JWT sub or opaque id) to agent */
  async bindTokenToAgent(token: string, agentId: string): Promise<void> {
    this.tokenToAgentId.set(token, agentId);
  }

  async resolveAgentIdByToken(token: string): Promise<string | null> {
    return this.tokenToAgentId.get(token) ?? null;
  }

  // ——— Agent runtimes ———
  async createAgentRuntime(input: Omit<AgentRuntime, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentRuntime> {
    const id = newId('rt');
    const ts = now();
    const rt: AgentRuntime = {
      id,
      agentId: input.agentId,
      orgId: input.orgId,
      displayName: input.displayName,
      framework: input.framework,
      approvedTools: input.approvedTools ?? [],
      defaultTrustLevel: input.defaultTrustLevel,
      status: input.status,
      revocationId: input.revocationId,
      createdAt: ts,
      updatedAt: ts,
    };
    this.agentRuntimes.set(id, rt);
    return rt;
  }

  async getAgentRuntime(id: string): Promise<AgentRuntime | null> {
    return this.agentRuntimes.get(id) ?? null;
  }

  async listAgentRuntimesByAgent(agentId: string): Promise<AgentRuntime[]> {
    return Array.from(this.agentRuntimes.values()).filter((r) => r.agentId === agentId);
  }

  async listAgentRuntimesByOrg(orgId: string): Promise<AgentRuntime[]> {
    return Array.from(this.agentRuntimes.values()).filter((r) => r.orgId === orgId);
  }

  async updateAgentRuntime(id: string, patch: Partial<Pick<AgentRuntime, 'displayName' | 'approvedTools' | 'defaultTrustLevel' | 'status' | 'revocationId'>>): Promise<AgentRuntime | null> {
    const rt = this.agentRuntimes.get(id);
    if (!rt) return null;
    const updated: AgentRuntime = { ...rt, ...patch, updatedAt: now() };
    this.agentRuntimes.set(id, updated);
    return updated;
  }

  async deleteAgentRuntime(id: string): Promise<boolean> {
    return this.agentRuntimes.delete(id);
  }

  /**
   * Resolve on-behalf-of: check if the given agent is allowed to act on behalf of subject (user id, role, or department).
   */
  async resolveOnBehalfOf(agentId: string, subject: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.onBehalfOfScope?.length) return false;
    return agent.onBehalfOfScope.includes(subject);
  }
}
