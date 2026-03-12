# Delegation Gatekeeper

Trust, delegation, approval, and audit layer between AI agents and external systems.

## What's built

The gateway uses the **full** implementation: identity store (seeded default agent), policy engine (allow/deny/require_approval), signed grants, revocation, audit log, approvals, budgets, trust scores, and execution adapters (REST, A2A, browser stub). Build: `npm run build`. Start: `npm start` (port 3040; set `PORT` or `GATEKEEPER_SIGNING_SECRET` in production).

**API summary:** `POST /delegate` (identity → policy → grant or 202 pending approval), `POST /execute` (verify grant → adapter → result), `GET/POST /approvals`, `POST /approvals/:id/decide`, `GET/POST /budgets`, `GET /audit/events`, `GET /audit/export`, `GET /trust/agents/:id/score`, `POST /grants/revoke`.

**CLI:** `npx dg delegate --token agent-1 --target rest`, `dg audit`, `dg approvals`, `dg revoke --grant-id <id>`. Env: `GATEKEEPER_BASE_URL`, `GATEKEEPER_TOKEN`.

**Admin UI:** Open `admin-ui/index.html` in a browser (or serve it); set base URL to your gateway to view pending approvals and audit events.

**Deployment:** `docker compose up` (see `Dockerfile` and `docker-compose.yml`). Set `GATEKEEPER_SIGNING_SECRET` in production.

## Project structure

| Area | Location | Description |
|------|----------|-------------|
| **Shared types** | `packages/types/` | Identity, Grant, PolicyDecision, AuditEvent, ActionRequest |
| **Identity layer** | `gateway/identity/` | IdentityStore, resolveCallerIdentity(store, request), CRUD/lookup, auth middleware |
| **Delegation + policy** | `gateway/delegation/`, `policy-engine/` | mintGrant, verifyGrant, revokeGrant, isRevoked; evaluatePolicy (allow/deny/require_approval) |
| **Audit layer** | `gateway/audit/` | AuditLog, appendEvent, queryEvents, optional hash chain |
| **Execution + gateway** | `src/gateway/`, `src/mediation/`, `src/adapters/` | POST /delegate, POST /execute, REST proxy adapter, adapter registry |
| **SDK** | `sdk/` | GatekeeperClient.requestDelegation, executeWithGrant |
| **Approval** | `gateway/approval/` | ApprovalStore, createRequest, decide |
| **Budget** | `gateway/budget/` | BudgetStore, checkWithinBudget, recordSpend |
| **Trust** | `gateway/trust/` | TrustStore, recordSignal, getScore |
| **Adapters** | `src/adapters/` | REST, A2A relay, browser (stub) |
| **CLI** | `cli/` | `dg delegate|execute|audit|approvals|revoke` |
| **Admin UI** | `admin-ui/` | Static HTML dashboard for approvals and audit |

## Gateway and SDK

- **Adapter interface**: `ExecutionAdapter.execute(verifiedGrant, actionPayload)` with revocation check before and audit after.
- **REST proxy adapter**: Forwards HTTP requests (target type `http` or `rest`).
- **Gateway**: `POST /delegate` (identity → policy → grant or 202 pending approval), `POST /execute` (verify → adapter → result), approvals, budgets, audit export, trust, revoke.
- **OpenAPI**: `docs/openapi.yaml`.
- **SDK**: `@delegation-gatekeeper/sdk` with `requestDelegation` and `executeWithGrant`.

### Gateway port

Default: **3040** (override with `PORT`).

### Run the gateway

```bash
# From project root
npm install
npm run build
npm start
```

Development (watch):

```bash
npm run dev
```

### Call from the SDK

```bash
# Build SDK
cd sdk && npm install && npm run build && cd ..
```

```ts
import { GatekeeperClient } from "@delegation-gatekeeper/sdk";

const client = new GatekeeperClient({
  baseUrl: "http://localhost:3040",
  token: "agent-1", // stub: used as agent id
});

// 1. Request a grant
const grant = await client.requestDelegation({
  targetType: "rest",
  intendedAction: "GET example.com",
  actionPayload: { url: "https://httpbin.org/get", method: "GET" },
});

// 2. Execute with the grant
const out = await client.executeWithGrant(grant, {
  url: "https://httpbin.org/get",
  method: "GET",
});
console.log(out.result);
```

Using the SDK from the repo (no publish):

```ts
import { GatekeeperClient } from "./sdk/src/index.js";
// or link: npm link ./sdk
```

### Files created (Phase 1.5–1.6)

| Area | Files |
|------|--------|
| Types & stubs | `src/types.ts`, `src/identity/index.ts`, `src/delegation/index.ts`, `src/policy/index.ts`, `src/audit/index.ts` |
| Adapter | `src/adapters/types.ts`, `src/adapters/rest-proxy-adapter.ts`, `src/adapters/registry.ts` |
| Mediation | `src/mediation/execute.ts` |
| Gateway | `src/gateway/server.ts` |
| API spec | `docs/openapi.yaml` |
| SDK | `sdk/package.json`, `sdk/tsconfig.json`, `sdk/src/types.ts`, `sdk/src/client.ts`, `sdk/src/index.ts` |

## License

This project is open source under the **MIT License**. See [LICENSE](LICENSE) for the full text.

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
