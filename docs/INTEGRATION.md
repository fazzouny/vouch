# Calling Vouch from an agent (OpenClaw or Claude Code)

Vouch exposes an HTTP API and an SDK. Any agent (OpenClaw, Claude Code, Cursor, or another IDE) can use the same contract: **request a delegation**, then **execute with the grant**. This keeps the design agent-agnostic.

## Environment

| Variable | Description | Default |
|----------|-------------|---------|
| `VOUCH_BASE_URL` | Gateway URL | `http://localhost:3040` |
| `VOUCH_TOKEN` | Bearer token (used as agent id by the gateway) | — |

## Flow

1. **POST /delegate** — Request a scoped grant.  
   - Headers: `Authorization: Bearer <VOUCH_TOKEN>`, `Content-Type: application/json`  
   - Body: `ActionRequest` (see [OpenAPI](openapi.yaml)): at least `targetType` (e.g. `rest`), optional `intendedAction`, `actionPayload`, etc.  
   - Response: `{ "grant": { ... } }` (or 401/403 with reason).

2. **POST /execute** — Run the action with the grant.  
   - Body: `{ "grant": "<signed grant from step 1>", "action": { ... } }`  
   - For REST: `action` is e.g. `{ "url", "method", "body" }`.  
   - Response: `{ "result", "statusCode" }` or error.

## Example (curl)

```bash
# 1. Request a delegation (agent id = agent-1)
curl -s -X POST http://localhost:3040/delegate \
  -H "Authorization: Bearer agent-1" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"rest","intendedAction":"GET example","actionPayload":{"url":"https://httpbin.org/get","method":"GET"}}'

# 2. Execute with the returned grant (use the "signed" or full grant in the body below)
curl -s -X POST http://localhost:3040/execute \
  -H "Content-Type: application/json" \
  -d '{"grant":"<paste grant from step 1>","action":{"url":"https://httpbin.org/get","method":"GET"}}'
```

## Example (SDK in Node/TypeScript)

```ts
import { VouchClient } from "@vouch/sdk";

const client = new VouchClient({
  baseUrl: process.env.VOUCH_BASE_URL ?? "http://localhost:3040",
  token: process.env.VOUCH_TOKEN ?? "agent-1",
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

## OpenClaw

- Copy the [OpenClaw skill](../integrations/openclaw/) into `~/.openclaw/workspace/skills/vouch/` (or your skills dir).  
- The skill describes when to use Vouch (e.g. for approved REST or sensitive actions) and how to call the API or SDK.  
- Set `VOUCH_BASE_URL` and `VOUCH_TOKEN` in your environment or OpenClaw config.

## Claude Code / Cursor (MCP)

- Use the [Vouch MCP server](../integrations/mcp-vouch/) so Claude Code (or Cursor) can call `request_delegation` and `execute_with_grant` as tools.  
- Configure the MCP server with the same `VOUCH_BASE_URL` and `VOUCH_TOKEN`; no changes to Vouch’s API are required.
