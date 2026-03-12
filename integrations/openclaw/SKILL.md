# Vouch — delegation and audit for sensitive actions

Use this skill when you need to perform **sensitive or gated actions** (REST calls, external APIs, paid operations) that should go through a trust layer: identity, policy (allow/deny/require approval), signed grants, and audit.

## When to use

- The user or context requires **approval or audit** for outbound API calls or tool use.
- You are about to call an external REST API or perform an action that should be **logged and policy-checked**.
- You are told to "use Vouch" or "go through the gatekeeper" for certain actions.

## How it works

1. **Request a delegation** — Call Vouch with the intended action (e.g. `GET https://api.example.com/data`). Vouch evaluates policy and may return a grant or deny/require approval.
2. **Execute with the grant** — If you received a grant, call Vouch again with that grant and the actual action payload. Vouch runs the action via its adapters and records it in the audit log.

## Tool: `vouch_request`

Use the `vouch_request` script (or the HTTP flow below) to perform the delegate → execute flow.

- **Input:** `intendedAction` (human-readable), `targetType` (e.g. `rest`), and for REST: `url`, `method`, optional `body`.
- **Output:** The result of the execution, or an error (e.g. policy denied, approval required).

Environment: set `VOUCH_BASE_URL` (default `http://localhost:3040`) and `VOUCH_TOKEN` (e.g. `agent-1`) so the tool can reach Vouch.

## HTTP flow (if not using the script)

1. `POST $VOUCH_BASE_URL/delegate` with `Authorization: Bearer $VOUCH_TOKEN` and body:
   ```json
   { "targetType": "rest", "intendedAction": "<description>", "actionPayload": { "url": "<url>", "method": "GET|POST|...", "body": {} } }
   ```
2. If response is 200, take the returned `grant` and call `POST $VOUCH_BASE_URL/execute` with body:
   ```json
   { "grant": "<signed grant from step 1>", "action": { "url": "<url>", "method": "...", "body": {} } }
   ```
3. Use the `result` (and optional `statusCode`) from the execute response.

Do not bypass Vouch for actions that the user or policy has designated as gated.
