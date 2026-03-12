# Vouch — Recipes

Short recipes for common setups.

## Gate MCP tools

**Goal:** Let Cursor or Claude Code call tools only after Vouch grants delegation for `targetType: "mcp"`.

1. Start the Vouch gateway: `npm start` (or set `VOUCH_BASE_URL` to your gateway).
2. Configure the [Vouch MCP server](../integrations/mcp-vouch/) in Cursor/Claude with `VOUCH_BASE_URL` and `VOUCH_TOKEN`.
3. The MCP server calls `POST /delegate` with `targetType: "mcp"` and optional `actionPayload: { serverName, toolName, params }`. Policy can allow, deny, or require approval for `targetService: "mcp"` (see default rule `allow-mcp-default` or your [policy pack](policy-pack-finance.example.json)).
4. After delegation, the client calls `POST /execute` with the grant and action. The gateway’s MCP adapter currently returns a “not implemented” message for execute; the main use is policy gating. Use the MCP server to gate which tools the agent can request.

**Example delegate (curl):**

```bash
curl -s -X POST http://localhost:3040/delegate \
  -H "Authorization: Bearer agent-1" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"mcp","intendedAction":"mcp:my-server:tool_name","scope":"mcp/my-server"}'
```

---

## Payment approval flow

**Goal:** Require human approval for payment-related actions; allow other REST freely.

1. Create a policy file (e.g. `policy.json`) with a rule that has `targetService: "payment"` and `effect: "require_approval"`, and an `allow` rule for `targetService: "rest"`. See [policy-pack-finance.example.json](policy-pack-finance.example.json).
2. Set `VOUCH_POLICY_PATH=/path/to/policy.json` and start the gateway.
3. Agents request delegation with `targetSystem: "payment"` (or a scope that your policy matches). They receive a pending approval instead of a grant.
4. Operators open the Admin UI, see the pending approval, and click Approve or Deny (with approver id and optional reason). On Approve, the gateway returns the grant; the agent can then call `POST /execute`.

**Example policy snippet:**

```json
{
  "config": {
    "defaultEffect": "deny",
    "rules": [
      { "id": "pay-approval", "targetService": "payment", "effect": "require_approval", "reason": "Payment requires approval" },
      { "id": "rest-ok", "targetService": "rest", "effect": "allow", "reason": "REST allowed" }
    ]
  }
}
```

---

## Multi-agent trust tiers

**Goal:** Low-trust agents are denied payment; medium/high can be allowed or require approval.

1. Use policy rules with `trustTier: "low"` and `targetService: "payment"` → `effect: "deny"`.
2. Add rules for `trustService: "payment"` without a tier (or `medium`/`high`) → `effect: "allow"` or `require_approval`.
3. Trust tier is computed by the gateway from execution and approval signals (see [CONCEPTS.md](CONCEPTS.md#trust-score-and-tier)). New agents start at medium by default.

**Example:**

```json
{ "trustTier": "low", "targetService": "payment", "effect": "deny", "reason": "Low-trust agents cannot perform payments" },
{ "targetService": "payment", "effect": "require_approval", "reason": "Payment requires approval" }
```

---

## File-backed audit and policy

**Goal:** Persist audit log and load policy from files so config and history survive restarts.

1. **Audit:** Set `VOUCH_AUDIT_FILE_PATH=/var/log/vouch/audit.jsonl`. The gateway will append one JSON event per line. Directory is created if missing. Optional hash chain is computed for tamper evidence.
2. **Policy:** Set `VOUCH_POLICY_PATH=/etc/vouch/policy.json`. The file can be a raw policy config or a policy pack (object with `config`). Gateway loads it at first use.
3. Restart the gateway; both settings take effect. Export events with `GET /audit/export?format=jsonl`.

**Health:** `GET /health` returns `audit: "file"|"memory"` and `policy: "file"|"default"` so you can confirm configuration.
