/**
 * SQLite-backed identity store. Use when VOUCH_DB_PATH is set for persistence.
 */
import Database from "better-sqlite3";
import type {
  Organization,
  Workspace,
  User,
  ServiceAccount,
  Agent,
  AgentRuntime,
} from "@vouch/types";

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface IdentityStoreConfig {
  connectionString?: string;
  /** Path to SQLite database file */
  dbPath?: string;
}

export class IdentityStoreSqlite {
  private db: Database.Database;

  constructor(config: IdentityStoreConfig & { dbPath: string }) {
    this.db = new Database(config.dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY, display_name TEXT, external_id TEXT, status TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY, org_id TEXT, display_name TEXT, parent_id TEXT, status TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, org_id TEXT, workspace_ids TEXT, display_name TEXT, email TEXT, external_id TEXT, status TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS service_accounts (
        id TEXT PRIMARY KEY, org_id TEXT, workspace_ids TEXT, display_name TEXT, external_id TEXT, status TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY, org_id TEXT, workspace_id TEXT, display_name TEXT, approved_tools TEXT, default_trust_level TEXT, status TEXT,
        on_behalf_of_scope TEXT, constraints TEXT, revocation_id TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agent_runtimes (
        id TEXT PRIMARY KEY, agent_id TEXT, org_id TEXT, display_name TEXT, framework TEXT, approved_tools TEXT, default_trust_level TEXT, status TEXT, revocation_id TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS api_key_to_agent (api_key TEXT PRIMARY KEY, agent_id TEXT);
      CREATE TABLE IF NOT EXISTS api_key_to_user (api_key TEXT PRIMARY KEY, user_id TEXT);
      CREATE TABLE IF NOT EXISTS api_key_to_service (api_key TEXT PRIMARY KEY, service_id TEXT);
      CREATE TABLE IF NOT EXISTS token_to_agent (token TEXT PRIMARY KEY, agent_id TEXT);
    `);
  }

  async createOrganization(input: Omit<Organization, "id" | "createdAt" | "updatedAt">): Promise<Organization> {
    const id = newId("org");
    const ts = now();
    const org: Organization = { id, displayName: input.displayName, externalId: input.externalId, status: input.status, createdAt: ts, updatedAt: ts };
    this.db.prepare("INSERT INTO organizations (id, display_name, external_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, org.displayName, org.externalId ?? null, org.status, ts, ts
    );
    return org;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    const row = this.db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? { id: row.id as string, displayName: row.display_name as string, externalId: (row.external_id as string) ?? undefined, status: row.status as Organization["status"], createdAt: row.created_at as string, updatedAt: row.updated_at as string } : null;
  }

  async listOrganizations(): Promise<Organization[]> {
    const rows = this.db.prepare("SELECT * FROM organizations").all() as Record<string, unknown>[];
    return rows.map((r) => ({ id: r.id as string, displayName: r.display_name as string, externalId: (r.external_id as string) ?? undefined, status: r.status as Organization["status"], createdAt: r.created_at as string, updatedAt: r.updated_at as string }));
  }

  async updateOrganization(id: string, patch: Partial<Pick<Organization, "displayName" | "status" | "externalId">>): Promise<Organization | null> {
    const org = await this.getOrganization(id);
    if (!org) return null;
    const updated = { ...org, ...patch, updatedAt: now() };
    this.db.prepare("UPDATE organizations SET display_name = ?, status = ?, external_id = ?, updated_at = ? WHERE id = ?").run(
      updated.displayName, updated.status, updated.externalId ?? null, updated.updatedAt, id
    );
    return updated;
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM organizations WHERE id = ?").run(id);
    return r.changes > 0;
  }

  async createWorkspace(input: Omit<Workspace, "id" | "createdAt" | "updatedAt">): Promise<Workspace> {
    const id = newId("ws");
    const ts = now();
    const ws: Workspace = { id, orgId: input.orgId, displayName: input.displayName, parentId: input.parentId, status: input.status, createdAt: ts, updatedAt: ts };
    this.db.prepare("INSERT INTO workspaces (id, org_id, display_name, parent_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, ws.orgId, ws.displayName, ws.parentId ?? null, ws.status, ts, ts
    );
    return ws;
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const row = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? { id: row.id as string, orgId: row.org_id as string, displayName: row.display_name as string, parentId: (row.parent_id as string) ?? undefined, status: row.status as Workspace["status"], createdAt: row.created_at as string, updatedAt: row.updated_at as string } : null;
  }

  async listWorkspacesByOrg(orgId: string): Promise<Workspace[]> {
    const rows = this.db.prepare("SELECT * FROM workspaces WHERE org_id = ?").all(orgId) as Record<string, unknown>[];
    return rows.map((r) => ({ id: r.id as string, orgId: r.org_id as string, displayName: r.display_name as string, parentId: (r.parent_id as string) ?? undefined, status: r.status as Workspace["status"], createdAt: r.created_at as string, updatedAt: r.updated_at as string }));
  }

  async updateWorkspace(id: string, patch: Partial<Pick<Workspace, "displayName" | "status" | "parentId">>): Promise<Workspace | null> {
    const ws = await this.getWorkspace(id);
    if (!ws) return null;
    const updated = { ...ws, ...patch, updatedAt: now() };
    this.db.prepare("UPDATE workspaces SET display_name = ?, status = ?, parent_id = ?, updated_at = ? WHERE id = ?").run(
      updated.displayName, updated.status, updated.parentId ?? null, updated.updatedAt, id
    );
    return updated;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM workspaces WHERE id = ?").run(id).changes > 0;
  }

  async createUser(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const id = newId("user");
    const ts = now();
    const user: User = { id, orgId: input.orgId, workspaceIds: input.workspaceIds ?? [], displayName: input.displayName, email: input.email, externalId: input.externalId, status: input.status, createdAt: ts, updatedAt: ts };
    this.db.prepare("INSERT INTO users (id, org_id, workspace_ids, display_name, email, external_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      id, user.orgId, JSON.stringify(user.workspaceIds), user.displayName, user.email ?? null, user.externalId ?? null, user.status, ts, ts
    );
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as string, orgId: row.org_id as string, workspaceIds: JSON.parse((row.workspace_ids as string) ?? "[]"), displayName: row.display_name as string, email: (row.email as string) ?? undefined, externalId: (row.external_id as string) ?? undefined, status: row.status as User["status"], createdAt: row.created_at as string, updatedAt: row.updated_at as string };
  }

  async listUsersByOrg(orgId: string): Promise<User[]> {
    const rows = this.db.prepare("SELECT * FROM users WHERE org_id = ?").all(orgId) as Record<string, unknown>[];
    return rows.map((r) => ({ id: r.id as string, orgId: r.org_id as string, workspaceIds: JSON.parse((r.workspace_ids as string) ?? "[]"), displayName: r.display_name as string, email: (r.email as string) ?? undefined, externalId: (r.external_id as string) ?? undefined, status: r.status as User["status"], createdAt: r.created_at as string, updatedAt: r.updated_at as string }));
  }

  async updateUser(id: string, patch: Partial<Pick<User, "displayName" | "email" | "workspaceIds" | "status" | "externalId">>): Promise<User | null> {
    const user = await this.getUser(id);
    if (!user) return null;
    const updated = { ...user, ...patch, updatedAt: now() };
    this.db.prepare("UPDATE users SET display_name = ?, email = ?, workspace_ids = ?, status = ?, external_id = ?, updated_at = ? WHERE id = ?").run(
      updated.displayName, updated.email ?? null, JSON.stringify(updated.workspaceIds), updated.status, updated.externalId ?? null, updated.updatedAt, id
    );
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
  }

  async createServiceAccount(input: Omit<ServiceAccount, "id" | "createdAt" | "updatedAt">): Promise<ServiceAccount> {
    const id = newId("sa");
    const ts = now();
    const sa: ServiceAccount = { id, orgId: input.orgId, workspaceIds: input.workspaceIds ?? [], displayName: input.displayName, externalId: input.externalId, status: input.status, createdAt: ts, updatedAt: ts };
    this.db.prepare("INSERT INTO service_accounts (id, org_id, workspace_ids, display_name, external_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      id, sa.orgId, JSON.stringify(sa.workspaceIds), sa.displayName, sa.externalId ?? null, sa.status, ts, ts
    );
    return sa;
  }

  async getServiceAccount(id: string): Promise<ServiceAccount | null> {
    const row = this.db.prepare("SELECT * FROM service_accounts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as string, orgId: row.org_id as string, workspaceIds: JSON.parse((row.workspace_ids as string) ?? "[]"), displayName: row.display_name as string, externalId: (row.external_id as string) ?? undefined, status: row.status as ServiceAccount["status"], createdAt: row.created_at as string, updatedAt: row.updated_at as string };
  }

  async listServiceAccountsByOrg(orgId: string): Promise<ServiceAccount[]> {
    const rows = this.db.prepare("SELECT * FROM service_accounts WHERE org_id = ?").all(orgId) as Record<string, unknown>[];
    return rows.map((r) => ({ id: r.id as string, orgId: r.org_id as string, workspaceIds: JSON.parse((r.workspace_ids as string) ?? "[]"), displayName: r.display_name as string, externalId: (r.external_id as string) ?? undefined, status: r.status as ServiceAccount["status"], createdAt: r.created_at as string, updatedAt: r.updated_at as string }));
  }

  async updateServiceAccount(id: string, patch: Partial<Pick<ServiceAccount, "displayName" | "workspaceIds" | "status" | "externalId">>): Promise<ServiceAccount | null> {
    const sa = await this.getServiceAccount(id);
    if (!sa) return null;
    const updated = { ...sa, ...patch, updatedAt: now() };
    this.db.prepare("UPDATE service_accounts SET display_name = ?, workspace_ids = ?, status = ?, external_id = ?, updated_at = ? WHERE id = ?").run(
      updated.displayName, JSON.stringify(updated.workspaceIds), updated.status, updated.externalId ?? null, updated.updatedAt, id
    );
    return updated;
  }

  async deleteServiceAccount(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM service_accounts WHERE id = ?").run(id).changes > 0;
  }

  async registerAgent(input: Omit<Agent, "id" | "createdAt" | "updatedAt">): Promise<Agent> {
    const id = newId("agent");
    const ts = now();
    const agent: Agent = {
      id, orgId: input.orgId, workspaceId: input.workspaceId, displayName: input.displayName,
      approvedTools: input.approvedTools ?? [], defaultTrustLevel: input.defaultTrustLevel, status: input.status,
      onBehalfOfScope: input.onBehalfOfScope, constraints: input.constraints, revocationId: input.revocationId,
      createdAt: ts, updatedAt: ts,
    };
    this.db.prepare(
      "INSERT INTO agents (id, org_id, workspace_id, display_name, approved_tools, default_trust_level, status, on_behalf_of_scope, constraints, revocation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, agent.orgId, agent.workspaceId, agent.displayName, JSON.stringify(agent.approvedTools), agent.defaultTrustLevel, agent.status, agent.onBehalfOfScope ? JSON.stringify(agent.onBehalfOfScope) : null, agent.constraints ? JSON.stringify(agent.constraints) : null, agent.revocationId ?? null, ts, ts);
    return agent;
  }

  async getAgent(id: string): Promise<Agent | null> {
    const row = this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string, orgId: row.org_id as string, workspaceId: row.workspace_id as string, displayName: row.display_name as string,
      approvedTools: JSON.parse((row.approved_tools as string) ?? "[]"), defaultTrustLevel: row.default_trust_level as Agent["defaultTrustLevel"], status: row.status as Agent["status"],
      onBehalfOfScope: row.on_behalf_of_scope ? (JSON.parse(row.on_behalf_of_scope as string) as string[]) : undefined,
      constraints: row.constraints ? (JSON.parse(row.constraints as string) as Record<string, unknown>) : undefined,
      revocationId: (row.revocation_id as string) ?? undefined, createdAt: row.created_at as string, updatedAt: row.updated_at as string,
    };
  }

  async listAgentsByOrg(orgId: string): Promise<Agent[]> {
    const rows = this.db.prepare("SELECT * FROM agents WHERE org_id = ?").all(orgId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string, orgId: r.org_id as string, workspaceId: r.workspace_id as string, displayName: r.display_name as string,
      approvedTools: JSON.parse((r.approved_tools as string) ?? "[]"), defaultTrustLevel: r.default_trust_level as Agent["defaultTrustLevel"], status: r.status as Agent["status"],
      onBehalfOfScope: r.on_behalf_of_scope ? (JSON.parse(r.on_behalf_of_scope as string) as string[]) : undefined,
      constraints: r.constraints ? (JSON.parse(r.constraints as string) as Record<string, unknown>) : undefined,
      revocationId: (r.revocation_id as string) ?? undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  }

  async listAgentsByWorkspace(workspaceId: string): Promise<Agent[]> {
    const rows = this.db.prepare("SELECT * FROM agents WHERE workspace_id = ?").all(workspaceId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string, orgId: r.org_id as string, workspaceId: r.workspace_id as string, displayName: r.display_name as string,
      approvedTools: JSON.parse((r.approved_tools as string) ?? "[]"), defaultTrustLevel: r.default_trust_level as Agent["defaultTrustLevel"], status: r.status as Agent["status"],
      onBehalfOfScope: r.on_behalf_of_scope ? (JSON.parse(r.on_behalf_of_scope as string) as string[]) : undefined,
      constraints: r.constraints ? (JSON.parse(r.constraints as string) as Record<string, unknown>) : undefined,
      revocationId: (r.revocation_id as string) ?? undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  }

  async updateAgent(id: string, patch: Partial<Pick<Agent, "displayName" | "approvedTools" | "defaultTrustLevel" | "status" | "onBehalfOfScope" | "constraints" | "revocationId">>): Promise<Agent | null> {
    const agent = await this.getAgent(id);
    if (!agent) return null;
    const updated = { ...agent, ...patch, updatedAt: now() };
    this.db.prepare(
      "UPDATE agents SET display_name = ?, approved_tools = ?, default_trust_level = ?, status = ?, on_behalf_of_scope = ?, constraints = ?, revocation_id = ?, updated_at = ? WHERE id = ?"
    ).run(updated.displayName, JSON.stringify(updated.approvedTools), updated.defaultTrustLevel, updated.status, updated.onBehalfOfScope ? JSON.stringify(updated.onBehalfOfScope) : null, updated.constraints ? JSON.stringify(updated.constraints) : null, updated.revocationId ?? null, updated.updatedAt, id);
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM agents WHERE id = ?").run(id).changes > 0;
  }

  async bindApiKeyToAgent(apiKey: string, agentId: string): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO api_key_to_agent (api_key, agent_id) VALUES (?, ?)").run(apiKey, agentId);
  }

  async bindApiKeyToUser(apiKey: string, userId: string): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO api_key_to_user (api_key, user_id) VALUES (?, ?)").run(apiKey, userId);
  }

  async bindApiKeyToServiceAccount(apiKey: string, serviceAccountId: string): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO api_key_to_service (api_key, service_id) VALUES (?, ?)").run(apiKey, serviceAccountId);
  }

  async resolveAgentIdByApiKey(apiKey: string): Promise<string | null> {
    const row = this.db.prepare("SELECT agent_id FROM api_key_to_agent WHERE api_key = ?").get(apiKey) as { agent_id: string } | undefined;
    return row?.agent_id ?? null;
  }

  async resolveUserIdByApiKey(apiKey: string): Promise<string | null> {
    const row = this.db.prepare("SELECT user_id FROM api_key_to_user WHERE api_key = ?").get(apiKey) as { user_id: string } | undefined;
    return row?.user_id ?? null;
  }

  async resolveServiceAccountIdByApiKey(apiKey: string): Promise<string | null> {
    const row = this.db.prepare("SELECT service_id FROM api_key_to_service WHERE api_key = ?").get(apiKey) as { service_id: string } | undefined;
    return row?.service_id ?? null;
  }

  async bindTokenToAgent(token: string, agentId: string): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO token_to_agent (token, agent_id) VALUES (?, ?)").run(token, agentId);
  }

  async resolveAgentIdByToken(token: string): Promise<string | null> {
    const row = this.db.prepare("SELECT agent_id FROM token_to_agent WHERE token = ?").get(token) as { agent_id: string } | undefined;
    return row?.agent_id ?? null;
  }

  async createAgentRuntime(input: Omit<AgentRuntime, "id" | "createdAt" | "updatedAt">): Promise<AgentRuntime> {
    const id = newId("rt");
    const ts = now();
    const rt: AgentRuntime = {
      id, agentId: input.agentId, orgId: input.orgId, displayName: input.displayName, framework: input.framework,
      approvedTools: input.approvedTools ?? [], defaultTrustLevel: input.defaultTrustLevel, status: input.status, revocationId: input.revocationId,
      createdAt: ts, updatedAt: ts,
    };
    this.db.prepare(
      "INSERT INTO agent_runtimes (id, agent_id, org_id, display_name, framework, approved_tools, default_trust_level, status, revocation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, rt.agentId, rt.orgId, rt.displayName, rt.framework ?? null, JSON.stringify(rt.approvedTools), rt.defaultTrustLevel, rt.status, rt.revocationId ?? null, ts, ts);
    return rt;
  }

  async getAgentRuntime(id: string): Promise<AgentRuntime | null> {
    const row = this.db.prepare("SELECT * FROM agent_runtimes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string, agentId: row.agent_id as string, orgId: row.org_id as string, displayName: row.display_name as string, framework: (row.framework as string) ?? undefined,
      approvedTools: JSON.parse((row.approved_tools as string) ?? "[]"), defaultTrustLevel: row.default_trust_level as AgentRuntime["defaultTrustLevel"], status: row.status as AgentRuntime["status"],
      revocationId: (row.revocation_id as string) ?? undefined, createdAt: row.created_at as string, updatedAt: row.updated_at as string,
    };
  }

  async listAgentRuntimesByAgent(agentId: string): Promise<AgentRuntime[]> {
    const rows = this.db.prepare("SELECT * FROM agent_runtimes WHERE agent_id = ?").all(agentId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string, agentId: r.agent_id as string, orgId: r.org_id as string, displayName: r.display_name as string, framework: (r.framework as string) ?? undefined,
      approvedTools: JSON.parse((r.approved_tools as string) ?? "[]"), defaultTrustLevel: r.default_trust_level as AgentRuntime["defaultTrustLevel"], status: r.status as AgentRuntime["status"],
      revocationId: (r.revocation_id as string) ?? undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  }

  async listAgentRuntimesByOrg(orgId: string): Promise<AgentRuntime[]> {
    const rows = this.db.prepare("SELECT * FROM agent_runtimes WHERE org_id = ?").all(orgId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string, agentId: r.agent_id as string, orgId: r.org_id as string, displayName: r.display_name as string, framework: (r.framework as string) ?? undefined,
      approvedTools: JSON.parse((r.approved_tools as string) ?? "[]"), defaultTrustLevel: r.default_trust_level as AgentRuntime["defaultTrustLevel"], status: r.status as AgentRuntime["status"],
      revocationId: (r.revocation_id as string) ?? undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    }));
  }

  async updateAgentRuntime(id: string, patch: Partial<Pick<AgentRuntime, "displayName" | "approvedTools" | "defaultTrustLevel" | "status" | "revocationId">>): Promise<AgentRuntime | null> {
    const rt = await this.getAgentRuntime(id);
    if (!rt) return null;
    const updated = { ...rt, ...patch, updatedAt: now() };
    this.db.prepare(
      "UPDATE agent_runtimes SET display_name = ?, approved_tools = ?, default_trust_level = ?, status = ?, revocation_id = ?, updated_at = ? WHERE id = ?"
    ).run(updated.displayName, JSON.stringify(updated.approvedTools), updated.defaultTrustLevel, updated.status, updated.revocationId ?? null, updated.updatedAt, id);
    return updated;
  }

  async deleteAgentRuntime(id: string): Promise<boolean> {
    return this.db.prepare("DELETE FROM agent_runtimes WHERE id = ?").run(id).changes > 0;
  }

  async resolveOnBehalfOf(agentId: string, subject: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    if (!agent || !agent.onBehalfOfScope?.length) return false;
    return agent.onBehalfOfScope.includes(subject);
  }
}
