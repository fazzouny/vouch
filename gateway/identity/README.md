# Identity Layer (Phase 1.1)

In-memory identity store, CRUD/lookup APIs, and auth resolution for the Delegation Gatekeeper.

## Exports

- **IdentityStore** — in-memory store (schema-ready for Postgres later). Entities: Organization, Workspace, User, ServiceAccount, Agent, AgentRuntime.
- **resolveCallerIdentity(store, request)** — resolves request headers to `(identity, onBehalfOf)` and returns a `ResolvedIdentityContext`.

## How to call identity resolution from the gateway

1. Create a store (e.g. one per process or inject):

```ts
import { IdentityStore, resolveCallerIdentity } from '@delegation-gatekeeper/gateway';
// or from the identity subpath:
// import { IdentityStore, resolveCallerIdentity } from '@delegation-gatekeeper/gateway/identity';

const store = new IdentityStore();
```

2. Before handling a request, resolve the caller:

```ts
// request: { headers: { 'x-api-key'?: string, 'authorization'?: string, 'x-agent-id'?, 'x-on-behalf-of'? } }
const outcome = await resolveCallerIdentity(store, request);

if (!outcome.ok) {
  // outcome.code: 'UNAUTHENTICATED' | 'AGENT_NOT_FOUND' | 'AGENT_REVOKED' | ...
  return response.status(401).json({ error: outcome.code, message: outcome.message });
}

const { context } = outcome;
// context.agentId | context.userId | context.serviceAccountId
// context.orgId, context.workspaceId, context.onBehalfOf, context.trustLevel
// context.identity: CallerIdentity (agent | user | service)
```

3. Use the context in policy and delegation (e.g. pass `context` to the delegation layer).

## Headers

- **x-api-key** — API key; must be bound via `store.bindApiKeyToAgent(key, agentId)` (or `bindApiKeyToUser` / `bindApiKeyToServiceAccount`).
- **authorization: Bearer &lt;token&gt;** — token mapped via `store.bindTokenToAgent(token, agentId)`.
- **x-agent-id** — optional override when API key is used for an agent.
- **x-on-behalf-of** — optional subject (user/role/department) the agent is acting for; must be in the agent’s `onBehalfOfScope`.

## CRUD and lookup (on IdentityStore)

- **Agents:** `registerAgent`, `getAgent`, `listAgentsByOrg`, `listAgentsByWorkspace`, `updateAgent`, `deleteAgent`
- **On-behalf-of:** `resolveOnBehalfOf(agentId, subject)` → boolean
- **Orgs, workspaces, users, service accounts, agent runtimes:** full CRUD and list-by-org/workspace/agent as in `store.ts`

## Tests

From repo root or `gateway`: `npm run test` (in gateway) runs the identity unit tests.
