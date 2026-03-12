/**
 * Revocation store: in-memory; revoke by grantId or agentId, isRevoked(grantId).
 */

const revokedGrants = new Set<string>();
const agentToGrantIds = new Map<string, Set<string>>();

/**
 * Register a grant as belonging to an agent (used when minting; enables revokeByAgent).
 */
export function registerGrant(grantId: string, agentId: string): void {
  let set = agentToGrantIds.get(agentId);
  if (!set) {
    set = new Set<string>();
    agentToGrantIds.set(agentId, set);
  }
  set.add(grantId);
}

/**
 * Revoke a single grant by id.
 */
export function revokeGrant(grantId: string): void {
  revokedGrants.add(grantId);
}

/**
 * Revoke all grants for an agent.
 */
export function revokeGrantsByAgent(agentId: string): void {
  const grantIds = agentToGrantIds.get(agentId);
  if (grantIds) {
    for (const id of grantIds) revokedGrants.add(id);
  }
}

/**
 * Revoke specific grants for an agent (convenience when caller has the list).
 */
export function revokeGrantsByAgentList(agentId: string, grantIds: string[]): void {
  let set = agentToGrantIds.get(agentId);
  if (!set) {
    set = new Set<string>();
    agentToGrantIds.set(agentId, set);
  }
  for (const id of grantIds) {
    revokedGrants.add(id);
    set.add(id);
  }
}

/**
 * Check whether a grant is revoked. Used by execution layer on every use.
 */
export function isRevoked(grantId: string): boolean {
  return revokedGrants.has(grantId);
}

/**
 * Clear all revocations (for testing only).
 */
export function clearRevocations(): void {
  revokedGrants.clear();
  agentToGrantIds.clear();
}
