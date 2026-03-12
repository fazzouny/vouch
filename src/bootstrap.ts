/**
 * Bootstrap: create identity store, approval store, seed default org/agent, and provide signing options.
 * Used by the gateway server to run with real identity and delegation.
 */
import fs from "node:fs";
import {
  IdentityStore,
  IdentityStoreSqlite,
  ApprovalStore,
  ApprovalStoreSqlite,
  BudgetStore,
  TrustStore,
  setDefaultAuditLog,
  createAuditLog,
  type SigningOptions,
} from "@vouch/gateway";
import {
  loadPolicyFromJson,
  DEFAULT_POLICY,
  type PolicyConfig,
} from "@vouch/policy-engine";

let store: IdentityStore | null = null;
let policyConfig: PolicyConfig | null = null;
let policyConfigLoaded = false;
let approvalStore: ApprovalStore | null = null;
let budgetStore: BudgetStore | null = null;
let trustStore: TrustStore | null = null;

const SIGNING_SECRET = process.env.VOUCH_SIGNING_SECRET ?? "dev-secret-change-in-production";

/**
 * Call once at server startup to wire file-backed audit log when VOUCH_AUDIT_FILE_PATH is set.
 */
export function initAuditLog(): void {
  const path = process.env.VOUCH_AUDIT_FILE_PATH;
  if (path) {
    setDefaultAuditLog(createAuditLog({ filePath: path, computeHashChain: true }));
  }
}

export function getSigningOptions(): SigningOptions {
  return {
    secret: SIGNING_SECRET,
    issuer: "vouch",
  };
}

export async function getIdentityStore(): Promise<IdentityStore> {
  if (store) return store;
  const dbPath = process.env.VOUCH_DB_PATH;
  if (dbPath) {
    const sqliteStore = new IdentityStoreSqlite({ dbPath });
    const orgs = await sqliteStore.listOrganizations();
    if (orgs.length === 0) {
      const org = await sqliteStore.createOrganization({
        displayName: "Default Org",
        status: "active",
      });
      const ws = await sqliteStore.createWorkspace({
        orgId: org.id,
        displayName: "Default Workspace",
        status: "active",
      });
      const agent = await sqliteStore.registerAgent({
        orgId: org.id,
        workspaceId: ws.id,
        displayName: "Default Agent",
        approvedTools: ["rest", "http", "api"],
        defaultTrustLevel: "medium",
        status: "active",
      });
      await sqliteStore.bindTokenToAgent("agent-1", agent.id);
      await sqliteStore.bindApiKeyToAgent("agent-1", agent.id);
    }
    store = sqliteStore as unknown as IdentityStore;
  } else {
    store = new IdentityStore();
    const org = await store.createOrganization({
      displayName: "Default Org",
      status: "active",
    });
    const ws = await store.createWorkspace({
      orgId: org.id,
      displayName: "Default Workspace",
      status: "active",
    });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: "Default Agent",
      approvedTools: ["rest", "http", "api"],
      defaultTrustLevel: "medium",
      status: "active",
    });
    await store.bindTokenToAgent("agent-1", agent.id);
    await store.bindApiKeyToAgent("agent-1", agent.id);
  }
  return store!;
}

export function getApprovalStore(): ApprovalStore {
  if (!approvalStore) {
    const dbPath = process.env.VOUCH_DB_PATH;
    approvalStore = (dbPath ? new ApprovalStoreSqlite(dbPath) : new ApprovalStore()) as ApprovalStore;
  }
  return approvalStore!;
}

export function getBudgetStore(): BudgetStore {
  if (!budgetStore) budgetStore = new BudgetStore();
  return budgetStore;
}

export function getTrustStore(): TrustStore {
  if (!trustStore) trustStore = new TrustStore();
  return trustStore;
}

/**
 * Returns the policy config to use for evaluation.
 * If VOUCH_POLICY_PATH is set, loads from that JSON file (policy pack or raw config); otherwise uses DEFAULT_POLICY.
 */
export function getPolicyConfig(): PolicyConfig {
  if (!policyConfigLoaded) {
    policyConfigLoaded = true;
    const path = process.env.VOUCH_POLICY_PATH;
    if (path && fs.existsSync(path)) {
      try {
        const raw = fs.readFileSync(path, "utf8");
        const parsed = JSON.parse(raw) as { config?: unknown } & Record<string, unknown>;
        const configObj = parsed.config != null ? parsed.config : parsed;
        policyConfig = loadPolicyFromJson(JSON.stringify(configObj));
      } catch {
        policyConfig = DEFAULT_POLICY;
      }
    } else {
      policyConfig = DEFAULT_POLICY;
    }
  }
  return policyConfig ?? DEFAULT_POLICY;
}
