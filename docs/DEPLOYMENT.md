# Delegation Gatekeeper — Deployment

## Docker

```bash
# Build and run (default port 3040)
export GATEKEEPER_SIGNING_SECRET=your-secret
docker compose up -d

# Or build image only
docker build -t delegation-gatekeeper .
docker run -p 3040:3040 -e GATEKEEPER_SIGNING_SECRET=secret delegation-gatekeeper
```

## Kubernetes (optional)

- Use the Docker image and deploy as a Deployment with a Service (NodePort or LoadBalancer).
- Mount a Secret for `GATEKEEPER_SIGNING_SECRET`.
- For production, add a PersistentVolume for file-backed audit log (set `GATEKEEPER_AUDIT_FILE_PATH` or use a DB adapter when implemented).

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3040 |
| `GATEKEEPER_SIGNING_SECRET` | Secret used to sign/verify grants | dev-only default; **must** set in production |

## Open-source scope

Included: core gateway, policy engine, grant mint/verify, REST/A2A/browser adapters, audit schema and APIs, SDK, CLI, reference admin UI, Docker Compose.

Optional / later: PostgreSQL/Redis backends, managed control plane, enterprise policy packs, long-term retention, premium connectors.
