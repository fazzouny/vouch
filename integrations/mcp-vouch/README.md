# Vouch MCP server

MCP server that exposes **request_delegation** and **execute_with_grant** as tools so Claude Code, Cursor, or other MCP clients can perform gated actions through Vouch.

## Prerequisites

- Vouch gateway running (e.g. `http://localhost:3040`)
- Node.js ≥18

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `VOUCH_BASE_URL` | Vouch gateway URL | `http://localhost:3040` |
| `VOUCH_TOKEN` | Bearer token (agent id) | `agent-1` |

## Build and run

```bash
cd integrations/mcp-vouch
npm install
npm run build
npm start
```

The server uses **stdio** (stdin/stdout). MCP clients spawn it as a subprocess and communicate via newline-delimited JSON-RPC.

## Cursor configuration

Add the Vouch MCP server in Cursor settings (e.g. `.cursor/mcp.json` or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "vouch": {
      "command": "node",
      "args": ["integrations/mcp-vouch/dist/index.js"],
      "env": {
        "VOUCH_BASE_URL": "http://localhost:3040",
        "VOUCH_TOKEN": "agent-1"
      }
    }
  }
}
```

Use an absolute path for `args[0]` if needed (e.g. `"C:/path/to/delegation-gatekeeper/integrations/mcp-vouch/dist/index.js"`).

## Claude Code / other IDEs

Configure your IDE’s MCP client to run:

- **Command:** `node`
- **Args:** path to `integrations/mcp-vouch/dist/index.js`
- **Env:** `VOUCH_BASE_URL`, `VOUCH_TOKEN`

No changes to Vouch’s API are required; the MCP server calls the same `POST /delegate` and `POST /execute` endpoints.

## Tools

- **request_delegation** — Request a delegation grant for a given action (`targetType`, optional `intendedAction`, `scope`, `actionPayload`). Returns a grant string to pass to `execute_with_grant`.
- **execute_with_grant** — Execute an action using a signed grant (`grant`, `action`). Returns `result` and optional `statusCode`.
