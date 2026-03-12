/**
 * Bootstrap: create identity store, approval store, seed default org/agent, and provide signing options.
 * Used by the gateway server to run with real identity and delegation.
 */
import {
  IdentityStore,
  ApprovalStore,
  BudgetStore,
  TrustStore,
  type SigningOptions,
} from "@delegation-gatekeeper/gateway";

let store: IdentityStore | null = null;
let approvalStore: ApprovalStore | null = null;
let budgetStore: BudgetStore | null = null;
let trustStore: TrustStore | null = null;

const SIGNING_SECRET = process.env.GATEKEEPER_SIGNING_SECRET ?? "dev-secret-change-in-production";

export function getSigningOptions(): SigningOptions {
  return {
    secret: SIGNING_SECRET,
    issuer: "delegation-gatekeeper",
  };
}

export async function getIdentityStore(): Promise<IdentityStore> {
  if (store) return store;
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

  return store;
}

export function getApprovalStore(): ApprovalStore {
  if (!approvalStore) approvalStore = new ApprovalStore();
  return approvalStore;
}

export function getBudgetStore(): BudgetStore {
  if (!budgetStore) budgetStore = new BudgetStore();
  return budgetStore;
}

export function getTrustStore(): TrustStore {
  if (!trustStore) trustStore = new TrustStore();
  return trustStore;
}
