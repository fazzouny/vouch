# Vouch — Deployment

## Docker

```bash
# Build and run (default port 3040)
export VOUCH_SIGNING_SECRET=your-secret
docker compose up -d

# Or build image only
docker build -t delegation-gatekeeper .
docker run -p 3040:3040 -e VOUCH_SIGNING_SECRET=secret delegation-gatekeeper
```

## Kubernetes (optional)

- Use the Docker image and deploy as a Deployment with a Service (NodePort or LoadBalancer).
- Mount a Secret for `VOUCH_SIGNING_SECRET`.
- For production, add a PersistentVolume for file-backed audit log (set `VOUCH_AUDIT_FILE_PATH` or use a DB adapter when implemented).

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3040 |
| `VOUCH_SIGNING_SECRET` | Secret used to sign/verify grants | dev-only default; **must** set in production |
| `VOUCH_POLICY_PATH` | Path to a JSON policy file (raw config or [policy pack](policy-pack-finance.example.json)); if set, used instead of built-in default policy | — |
| `VOUCH_AUDIT_FILE_PATH` | Path to a JSONL file for persistent audit log; if set, audit events are appended to this file | in-memory |
| `VOUCH_DB_PATH` | Path to a SQLite database file for identity and approval stores; if set, data persists across restarts (optional; otherwise in-memory) | — |
| `VOUCH_ADMIN_API_KEY` | When set, approval, audit, trust, and revoke endpoints require this value in `Authorization: Bearer <key>` or `X-API-Key` header; if unset, those routes are unprotected | — |
| `VOUCH_RATE_LIMIT_DELEGATE_PER_AGENT` | Max delegation requests per agent per minute (fixed window); 0 or unset = no limit. Returns 429 with `Retry-After` when exceeded | 0 (no limit) |

## Health and metrics

- **GET /health** — Returns `{ status: "ok", audit: "file"|"memory", policy: "file"|"default" }`. Use for liveness/readiness probes.
- **GET /metrics** — Returns Prometheus text format with counters: `vouch_delegation_*`, `vouch_execution_*`, `vouch_approval_*`. Scrape with Prometheus or use for dashboards.

## Open-source scope

Included: core gateway, policy engine, grant mint/verify, REST/A2A/browser adapters, audit schema and APIs, SDK, CLI, reference admin UI, Docker Compose.

Optional / later: PostgreSQL/Redis backends, managed control plane, enterprise policy packs, long-term retention, premium connectors.
