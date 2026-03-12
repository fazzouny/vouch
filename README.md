# Vouch

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

**Trust, delegation, approval, and audit** — the control layer between AI agents and the systems they call.  
*One name to remember: **Vouch** for your agents.*

---

## Why Vouch?

AI agents need to call APIs, run tools, and access resources. Letting them do that without a gate means risk: no visibility, no policy, no way to say “this agent can do X but not Y.” **Vouch** sits in the middle: agents request a *delegation* (a scoped grant); you get identity, policy (allow/deny/require approval), signed grants, revocation, budgets, trust scores, and a full audit trail. Run it yourself — no vendor lock-in.

## Quick start

```bash
git clone https://github.com/fazzouny/vouch.git
cd vouch
npm install
npm run build
npm start
```

Gateway runs at **http://localhost:3040**. Use the CLI or SDK to request a grant and execute an action (see below).

| What you need | Command / env |
|---------------|----------------|
| **CLI** | `npx vouch delegate --token agent-1 --target rest` then `vouch audit`, `vouch approvals`, `vouch revoke --grant-id <id>` |
| **Env** | `VOUCH_BASE_URL` (default `http://localhost:3040`), `VOUCH_TOKEN` (e.g. `agent-1`) |
| **Production** | Set `VOUCH_SIGNING_SECRET`; see [Deployment](docs/DEPLOYMENT.md) and `docker compose up` |

## What’s included

- **Gateway** — Identity (seeded default agent), policy engine (allow / deny / require_approval), signed grants, revocation, audit log (with optional hash chain), approvals, budgets, trust scores.
- **Execution adapters** — REST proxy, A2A relay, browser (stub).
- **API** — `POST /delegate`, `POST /execute`, `GET/POST /approvals`, `POST /approvals/:id/decide`, `GET/POST /budgets`, `GET /audit/events`, `GET /audit/export`, `GET /trust/agents/:id/score`, `POST /grants/revoke`. See [OpenAPI](docs/openapi.yaml).
- **SDK** — `@vouch/sdk`: `VouchClient.requestDelegation`, `executeWithGrant`.
- **CLI** — `vouch` for delegate, execute, audit, approvals, revoke.
- **Admin UI** — Static dashboard for pending approvals and audit events (serve `admin-ui/` and point base URL at your gateway).

## Project structure

| Area | Location | Description |
|------|----------|-------------|
| **Shared types** | `packages/types/` | Identity, Grant, PolicyDecision, AuditEvent, ActionRequest |
| **Identity** | `gateway/identity/` | IdentityStore, resolveCallerIdentity, auth |
| **Delegation + policy** | `gateway/delegation/`, `policy-engine/` | mintGrant, verifyGrant, revokeGrant; evaluatePolicy |
| **Audit** | `gateway/audit/` | AuditLog, appendEvent, queryEvents, hash chain |
| **Gateway + execution** | `src/gateway/`, `src/mediation/`, `src/adapters/` | Routes, REST/A2A/browser adapters |
| **SDK** | `sdk/` | VouchClient.requestDelegation, executeWithGrant |
| **Approval / budget / trust** | `gateway/approval/`, `gateway/budget/`, `gateway/trust/` | Stores and APIs |
| **CLI** | `cli/` | `vouch delegate | execute | audit | approvals | revoke` |
| **Admin UI** | `admin-ui/` | Dashboard for approvals and audit |

## Using the SDK

```bash
# From repo root (SDK is a workspace package)
cd sdk && npm install && npm run build && cd ..
```

```ts
import { VouchClient } from "@vouch/sdk";

const client = new VouchClient({
  baseUrl: "http://localhost:3040",
  token: "agent-1",
});

const grant = await client.requestDelegation({
  targetType: "rest",
  intendedAction: "GET example.com",
  actionPayload: { url: "https://httpbin.org/get", method: "GET" },
});

const out = await client.executeWithGrant(grant, {
  url: "https://httpbin.org/get",
  method: "GET",
});
console.log(out.result);
```

Without publishing the SDK, use a path import: `import { VouchClient } from "./sdk/src/index.js";` or `npm link ./sdk`.

## Docs

- [Deployment](docs/DEPLOYMENT.md) — Docker, env vars, production notes
- [OpenAPI](docs/openapi.yaml) — API spec
- [Policy pack example](docs/policy-pack-finance.example.json) — JSON policy sample

## License and contributing

- **License:** [MIT](LICENSE)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security:** [SECURITY.md](SECURITY.md)
- **Code of conduct:** [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

Repository: **[github.com/fazzouny/vouch](https://github.com/fazzouny/vouch)**
