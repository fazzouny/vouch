/**
 * Main gateway HTTP server: POST /delegate, POST /execute.
 * Uses real identity store, policy engine, grant minting/verification, and execution adapters.
 */

import express from "express";
import cors from "cors";
import {
  IdentityStore,
  resolveCallerIdentity,
  mintGrant,
  verifyGrant,
  appendEvent,
  queryEvents,
  evaluatePolicy,
  TrustStore,
  type SigningOptions,
  type ResolvedIdentityContext,
} from "@delegation-gatekeeper/gateway";
import * as crypto from "node:crypto";
import type {
  ActionRequest as TypesActionRequest,
  SignedGrant,
  GrantPayload,
  AuditRequestPayload,
  AuditExecutionPayload,
} from "@delegation-gatekeeper/types";
import type { AgentIdentity } from "@delegation-gatekeeper/policy-engine";
import { getIdentityStore, getSigningOptions, getApprovalStore, getBudgetStore, getTrustStore } from "../bootstrap.js";
import { getAdapter } from "../adapters/registry.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3040;

const app = express();
app.use(cors());
app.use(express.json());

/** Request body for POST /delegate (supports both stub targetType and plan targetSystem) */
interface DelegateBody {
  targetType?: string;
  targetSystem?: string;
  intendedAction?: string;
  scope?: string;
  taskId?: string;
  runId?: string;
  onBehalfOf?: string;
  costEstimate?: number;
  actionPayload?: Record<string, unknown>;
}

function toActionRequest(body: DelegateBody): TypesActionRequest {
  const targetSystem = body.targetSystem ?? body.targetType ?? "rest";
  return {
    intendedAction: body.intendedAction ?? targetSystem,
    targetSystem,
    scope: body.scope ?? "default",
    taskId: body.taskId,
    runId: body.runId,
    onBehalfOf: body.onBehalfOf,
    costEstimate: body.costEstimate,
  };
}

async function toAgentIdentity(context: ResolvedIdentityContext): Promise<AgentIdentity | null> {
  if (context.identity.kind !== "agent") return null;
  const agent = context.identity.agent;
  const trustStore = getTrustStore();
  const trustScore = await trustStore.getScore("agent", agent.id);
  return {
    id: agent.id,
    approvedTools: agent.approvedTools ?? [],
    status: agent.status,
    agentGroup: undefined,
    trustTier: trustScore?.tier ?? "medium",
  };
}

function grantPayloadToVerifiedGrant(payload: GrantPayload): VerifiedGrant {
  return {
    grantId: payload.grantId,
    agentId: payload.agentId,
    scope: payload.audience,
    expiresAt: payload.expiresAt,
    policyDecisionId: payload.policyDecisionId,
    revocationId: payload.revocationId,
    targetType: payload.scope.target,
    verifiedAt: new Date().toISOString(),
  };
}

app.post("/delegate", async (req, res) => {
  try {
    const store: IdentityStore = await getIdentityStore();
    const outcome = await resolveCallerIdentity(store, req);
    if (!outcome.ok) {
      res.status(401).json({ error: "unauthorized", reason: outcome.message });
      return;
    }
    const { context } = outcome;

    const body = req.body as DelegateBody;
    if (!body?.targetType && !body?.targetSystem) {
      res.status(400).json({ error: "bad_request", reason: "body must include targetType or targetSystem" });
      return;
    }

    const agentIdentity = await toAgentIdentity(context);
    if (!agentIdentity) {
      res.status(403).json({ error: "forbidden", reason: "only agent identity can request delegation" });
      return;
    }

    const actionRequest = toActionRequest(body);
    const signingOptions: SigningOptions = getSigningOptions();

    const policyDecision = evaluatePolicy(actionRequest, agentIdentity);
    if (policyDecision.result === "deny") {
      res.status(403).json({
        error: "forbidden",
        reason: policyDecision.reason,
        decisionId: policyDecision.decisionId,
      });
      return;
    }
    if (policyDecision.result === "require_approval") {
      const approvalStore = getApprovalStore();
      const approvalRequest = await approvalStore.createRequest({
        requesterId: agentIdentity.id,
        requesterKind: "agent",
        orgId: context.orgId,
        reason: policyDecision.reason ?? "Policy requires human approval",
        scopeSummary: `${actionRequest.targetSystem}:${actionRequest.scope}`,
        policyDecisionId: policyDecision.decisionId,
        taskId: actionRequest.taskId,
        runId: actionRequest.runId,
        actionRequestSnapshot: { actionRequest, agentIdentity },
        type: "one_time",
        expiresInSeconds: 24 * 60 * 60,
      });
      res.status(202).json({
        pending_approval: true,
        approvalRequestId: approvalRequest.id,
        expiresAt: approvalRequest.expiresAt,
        message: "Action requires approval; use POST /approvals/:id/decide to approve or deny.",
      });
      return;
    }

    const costEstimate = actionRequest.costEstimate ?? 0;
    if (costEstimate > 0) {
      const budgetStore = getBudgetStore();
      const check = await budgetStore.checkWithinBudget("agent", agentIdentity.id, costEstimate);
      if (!check.allowed) {
        res.status(403).json({
          error: "forbidden",
          reason: check.reason ?? "Budget limit would be exceeded",
        });
        return;
      }
    }

    const result = mintGrant(
      { actionRequest, resolvedIdentity: agentIdentity },
      signingOptions
    );
    if (!result.granted) {
      res.status(403).json({
        error: "forbidden",
        reason: result.reason,
        decisionId: result.decisionId,
      });
      return;
    }

    appendEvent({
      eventId: crypto.randomUUID(),
      eventType: "request",
      timestamp: new Date().toISOString(),
      actorId: agentIdentity.id,
      agentId: agentIdentity.id,
      taskId: actionRequest.taskId,
      runId: actionRequest.runId,
      policyDecisionId: result.signedGrant.payload.policyDecisionId,
      payload: {
        action: actionRequest.intendedAction,
        target: actionRequest.targetSystem,
        scope: actionRequest.scope,
        taskId: actionRequest.taskId,
        runId: actionRequest.runId,
        onBehalfOf: actionRequest.onBehalfOf,
      } as AuditRequestPayload,
    });

    res.status(200).json({ grant: result.signedGrant });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post("/execute", async (req, res) => {
  try {
    const { grant: grantRaw, action } = req.body as {
      grant?: string | SignedGrant;
      action?: Record<string, unknown>;
    };
    if (!grantRaw || !action) {
      res.status(400).json({ error: "bad_request", reason: "body must include grant and action" });
      return;
    }

    const signedGrant: SignedGrant =
      typeof grantRaw === "string" ? (JSON.parse(grantRaw) as SignedGrant) : grantRaw;
    const options = { secret: getSigningOptions().secret };
    const verified = verifyGrant(signedGrant, options);

    if (!verified.valid) {
      res.status(400).json({ error: "invalid_grant", reason: verified.error });
      return;
    }

    const verifiedGrant = grantPayloadToVerifiedGrant(verified.grant);
    const adapter = getAdapter(verifiedGrant.targetType);
    if (!adapter) {
      res.status(400).json({ error: "no_adapter", reason: `no adapter for target type: ${verifiedGrant.targetType}` });
      return;
    }

    const execResult: ExecutionResult = await adapter.execute(verifiedGrant, action);
    const trustStore = getTrustStore();
    if (execResult.success) {
      await trustStore.recordSignal({
        subjectType: "agent",
        subjectId: verifiedGrant.agentId,
        signalType: "execution_success",
        ref: verifiedGrant.grantId,
      });
    } else {
      await trustStore.recordSignal({
        subjectType: "agent",
        subjectId: verifiedGrant.agentId,
        signalType: "execution_failure",
        ref: verifiedGrant.grantId,
      });
    }
    if (!execResult.success) {
      res.status(400).json({ error: "execution_failed", reason: execResult.error });
      return;
    }

    const payload = verified.grant;
    const cost = (action as { cost?: number }).cost ?? (action as { costEstimate?: number }).costEstimate ?? 0;
    if (cost > 0) {
      const budgetStore = getBudgetStore();
      const budgets = await budgetStore.getByScope("agent", verifiedGrant.agentId);
      if (budgets.length > 0) {
        await budgetStore.recordSpend({
          budgetId: budgets[0]!.id,
          amount: cost,
          taskId: payload.taskId,
          runId: payload.runId,
          merchant: verifiedGrant.targetType,
        });
      }
    }

    appendEvent({
      eventId: crypto.randomUUID(),
      eventType: "execution",
      timestamp: new Date().toISOString(),
      actorId: verifiedGrant.agentId,
      agentId: verifiedGrant.agentId,
      taskId: payload.taskId,
      runId: payload.runId,
      policyDecisionId: verifiedGrant.policyDecisionId,
      payload: {
        grantId: verifiedGrant.grantId,
        action: verifiedGrant.targetType,
        target: verifiedGrant.targetType,
        success: execResult.success,
        responseSummary: execResult.data != null ? String(JSON.stringify(execResult.data)).slice(0, 500) : undefined,
      } as AuditExecutionPayload,
    });

    res.status(200).json({ result: execResult.data, statusCode: execResult.statusCode });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/approvals", async (_req, res) => {
  try {
    const approvalStore = getApprovalStore();
    const status = _req.query.status as "pending" | "approved" | "denied" | "expired" | undefined;
    const orgId = _req.query.orgId as string | undefined;
    const limit = _req.query.limit != null ? parseInt(String(_req.query.limit), 10) : undefined;
    const list = await approvalStore.listRequests({ status, orgId, limit });
    res.status(200).json({ approvals: list });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/approvals/:id", async (req, res) => {
  try {
    const approvalStore = getApprovalStore();
    const request = await approvalStore.getRequest(req.params.id!);
    if (!request) {
      res.status(404).json({ error: "not_found", reason: "approval request not found" });
      return;
    }
    res.status(200).json(request);
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post("/approvals/:id/decide", async (req, res) => {
  try {
    const approvalStore = getApprovalStore();
    const { decision, approverId, reason } = req.body as {
      decision?: "approved" | "denied";
      approverId?: string;
      reason?: string;
    };
    if (!decision || !approverId || !["approved", "denied"].includes(decision)) {
      res.status(400).json({
        error: "bad_request",
        reason: "body must include decision ('approved' | 'denied') and approverId",
      });
      return;
    }
    const outcome = await approvalStore.decide(
      req.params.id!,
      decision,
      approverId,
      "user",
      reason
    );
    if (!outcome) {
      res.status(404).json({
        error: "not_found",
        reason: "approval request not found or already decided or expired",
      });
      return;
    }
    if (decision === "denied") {
      const trustStore = getTrustStore();
      await trustStore.recordSignal({
        subjectType: "agent",
        subjectId: outcome.request.requesterId,
        signalType: "approval_denied",
        ref: outcome.request.id,
      });
      res.status(200).json({ decided: "denied", approvalRequestId: outcome.request.id });
      return;
    }
    const trustStore = getTrustStore();
    await trustStore.recordSignal({
      subjectType: "agent",
      subjectId: outcome.request.requesterId,
      signalType: "approval_granted",
      ref: outcome.request.id,
    });
    const snapshot = outcome.request.actionRequestSnapshot as {
      actionRequest: TypesActionRequest;
      agentIdentity: AgentIdentity;
    };
    const signingOptions = getSigningOptions();
    const mintResult = mintGrant(
      { actionRequest: snapshot.actionRequest, resolvedIdentity: snapshot.agentIdentity },
      signingOptions
    );
    if (!mintResult.granted) {
      res.status(500).json({
        error: "grant_failed",
        reason: mintResult.reason,
      });
      return;
    }
    res.status(200).json({
      decided: "approved",
      approvalRequestId: outcome.request.id,
      grant: mintResult.signedGrant,
    });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/audit/events", async (req, res) => {
  try {
    const agentId = req.query.agentId as string | undefined;
    const taskId = req.query.taskId as string | undefined;
    const runId = req.query.runId as string | undefined;
    const actionType = req.query.actionType as
      | "request"
      | "policy_decision"
      | "execution"
      | "approval"
      | "revocation"
      | undefined;
    const startTime = req.query.startTime as string | undefined;
    const endTime = req.query.endTime as string | undefined;
    const events = queryEvents({
      agentId,
      taskId,
      runId,
      actionType,
      startTime,
      endTime,
    });
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/audit/export", async (req, res) => {
  try {
    const format = (req.query.format as string) || "jsonl";
    const startTime = req.query.startTime as string | undefined;
    const endTime = req.query.endTime as string | undefined;
    const agentId = req.query.agentId as string | undefined;
    const events = queryEvents({ agentId, startTime, endTime });
    if (format === "jsonl") {
      res.setHeader("Content-Type", "application/x-ndjson");
      res.status(200).send(events.map((e) => JSON.stringify(e)).join("\n"));
      return;
    }
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/trust/agents/:agentId/score", async (req, res) => {
  try {
    const trustStore = getTrustStore();
    const score = await trustStore.getScore("agent", req.params.agentId!);
    if (!score) {
      res.status(404).json({ error: "not_found", reason: "no trust score for this agent" });
      return;
    }
    res.status(200).json(score);
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/budgets", async (req, res) => {
  try {
    const budgetStore = getBudgetStore();
    const scope = req.query.scope as "agent" | "task" | "workspace" | "org" | undefined;
    const scopeId = req.query.scopeId as string | undefined;
    if (!scope || !scopeId) {
      res.status(400).json({ error: "bad_request", reason: "query must include scope and scopeId" });
      return;
    }
    const list = await budgetStore.getByScope(scope, scopeId);
    res.status(200).json({ budgets: list });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post("/grants/revoke", async (req, res) => {
  try {
    const { revokeGrant } = await import("@delegation-gatekeeper/gateway");
    const { grantId } = req.body as { grantId?: string };
    if (!grantId) {
      res.status(400).json({ error: "bad_request", reason: "body must include grantId" });
      return;
    }
    revokeGrant(grantId);
    res.status(200).json({ revoked: true, grantId });
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post("/budgets", async (req, res) => {
  try {
    const budgetStore = getBudgetStore();
    const body = req.body as { scope?: string; scopeId?: string; label?: string; limitUnits?: number; resetPolicy?: string };
    if (!body?.scope || !body?.scopeId || body?.limitUnits == null) {
      res.status(400).json({
        error: "bad_request",
        reason: "body must include scope, scopeId, and limitUnits",
      });
      return;
    }
    const budget = await budgetStore.createBudget({
      scope: body.scope as "agent" | "task" | "workspace" | "org",
      scopeId: body.scopeId,
      label: body.label,
      limitUnits: Number(body.limitUnits),
      resetPolicy: body.resetPolicy as "never" | "daily" | "weekly" | "monthly" | "per_task" | undefined,
    });
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({
      error: "internal_error",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Delegation Gatekeeper gateway listening on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or run with PORT=3041 npm start`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
