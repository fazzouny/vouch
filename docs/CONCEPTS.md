# Vouch — Concepts

This doc explains the main concepts: grant lifecycle, policy, approval flow, trust, and audit.

## Grant lifecycle

1. **Request** — An agent calls `POST /delegate` with an action request (target type, scope, optional payload). The gateway resolves the caller identity (from `Authorization` or `X-API-Key`).
2. **Policy** — The request is evaluated against the policy engine. Outcome: **allow**, **deny**, or **require_approval**.
3. **Grant** — If allowed (or after approval), the gateway mints a signed **grant**: a short-lived, scoped token that authorizes one execution. The grant includes grant id, agent id, scope, expiry, and policy decision id.
4. **Execute** — The agent calls `POST /execute` with the grant and the action payload. The gateway verifies the grant, checks revocation, runs the action via the right adapter (REST, A2A, MCP, etc.), records trust signals and audit, and returns the result.

Denied requests never get a grant. Requests that require approval create an approval request; a human (or service) approves or denies via `POST /approvals/:id/decide`. If approved, the gateway mints the grant and returns it in the response so the agent can then call `/execute`.

## Policy evaluation

Policy is a list of **rules** matched in order. Each rule can match on agent id, agent group, trust tier, tool type, target service, and scope. The rule’s **effect** is `allow`, `deny`, or `require_approval`. Deny wins over allow; require_approval means no immediate grant — an approval request is created instead.

If no rule matches, the **default effect** applies (usually **deny**). Policy can be loaded from a JSON file via `VOUCH_POLICY_PATH` (see [policy-pack-finance.example.json](policy-pack-finance.example.json)) or use the built-in default.

## Approval flow

When policy returns **require_approval**:

1. The gateway creates an **approval request** (pending) and returns 202 or a reference so the agent knows to wait.
2. An operator (or another service) lists pending requests with `GET /approvals?status=pending` and decides with `POST /approvals/:id/decide` (body: `decision`, `approverId`, optional `reason`).
3. If **approved**, the gateway mints the grant and returns it in the response; the client can then call `POST /execute` with that grant. If **denied**, the request is closed and no grant is issued.

The Admin UI shows pending approvals and lets you Approve or Deny with an approver id and optional reason.

## Trust score and tier

The **trust** layer records signals per agent (e.g. execution success/failure, approval granted/denied). It aggregates them into a **score** and a **tier** (low, medium, high). Policy rules can use `trustTier` to deny low-trust agents from sensitive actions (e.g. payments) or to require approval.

## Audit and hash chain

Every delegation request, policy decision, execution, and approval is written to the **audit log**. You can query by agent, task, time range, and event type (`GET /audit/events`, `GET /audit/export`). When using a file-backed log (`VOUCH_AUDIT_FILE_PATH`), each event can include a **previousEventHash** so the log forms a hash chain for tamper evidence.

## Standards and ecosystem

Vouch is designed as a **delegation and authorization layer** between AI agents and the systems they call (APIs, tools, MCP, A2A). It can align with emerging agent-to-agent and agent-to-tool standards:

- **A2A (Agent-to-Agent):** The gateway includes an A2A relay adapter (`targetType: "a2a"`), so agents can request delegation and execute via protocols that support A2A-style invocation.
- **MCP (Model Context Protocol):** MCP is a first-class target type; policy can allow, deny, or require approval for MCP tool access. The [Vouch MCP server](../integrations/mcp-vouch) lets Cursor, Claude Code, and other MCP clients use Vouch without changing the gateway API.

Vouch does not implement a specific delegation or authorization spec end-to-end; it provides a self-hosted control plane (identity, policy, grants, approval, audit) that you can use as the reference implementation for “agent delegation” in your stack.

## Summary

| Concept    | Purpose |
|-----------|---------|
| **Grant** | Short-lived, scoped token proving the gateway authorized this action for this agent. |
| **Policy** | Allow / deny / require_approval by agent, trust, target, and scope. |
| **Approval** | Human (or service) sign-off before a grant is minted for sensitive actions. |
| **Trust** | Score and tier per agent from execution and approval signals; used by policy. |
| **Audit** | Immutable log of requests, decisions, executions, and approvals; optional hash chain. |
