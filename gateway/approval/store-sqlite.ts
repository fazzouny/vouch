/**
 * SQLite-backed approval store. Use when VOUCH_DB_PATH is set for persistence.
 */
import Database from "better-sqlite3";
import type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus,
} from "@vouch/types";
import type { CreateApprovalRequestInput } from "./store.js";

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class ApprovalStoreSqlite {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        requester_kind TEXT NOT NULL,
        org_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        scope_summary TEXT NOT NULL,
        risk_cost_estimate TEXT,
        policy_decision_id TEXT,
        task_id TEXT,
        run_id TEXT,
        action_request_snapshot TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'one_time',
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        required_approver_ids TEXT
      );
      CREATE TABLE IF NOT EXISTS approval_decisions (
        id TEXT PRIMARY KEY,
        approval_request_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        approver_kind TEXT NOT NULL,
        reason TEXT,
        decided_at TEXT NOT NULL
      );
    `);
  }

  async createRequest(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    const id = newId("apr");
    const ts = now();
    const expiresIn = input.expiresInSeconds ?? 24 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const request: ApprovalRequest = {
      id,
      requesterId: input.requesterId,
      requesterKind: input.requesterKind,
      orgId: input.orgId,
      reason: input.reason,
      scopeSummary: input.scopeSummary,
      riskCostEstimate: input.riskCostEstimate,
      policyDecisionId: input.policyDecisionId,
      taskId: input.taskId,
      runId: input.runId,
      actionRequestSnapshot: input.actionRequestSnapshot,
      type: input.type ?? "one_time",
      status: "pending",
      expiresAt,
      createdAt: ts,
      updatedAt: ts,
      requiredApproverIds: input.requiredApproverIds,
    };
    const stmt = this.db.prepare(`
      INSERT INTO approval_requests (
        id, requester_id, requester_kind, org_id, reason, scope_summary,
        risk_cost_estimate, policy_decision_id, task_id, run_id, action_request_snapshot,
        type, status, expires_at, created_at, updated_at, required_approver_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      request.requesterId,
      request.requesterKind,
      request.orgId,
      request.reason,
      request.scopeSummary,
      request.riskCostEstimate ?? null,
      request.policyDecisionId ?? null,
      request.taskId ?? null,
      request.runId ?? null,
      JSON.stringify(request.actionRequestSnapshot),
      request.type,
      request.status,
      request.expiresAt,
      request.createdAt,
      request.updatedAt,
      request.requiredApproverIds ? JSON.stringify(request.requiredApproverIds) : null
    );
    return request;
  }

  private rowToRequest(row: Record<string, unknown>): ApprovalRequest {
    return {
      id: row.id as string,
      requesterId: row.requester_id as string,
      requesterKind: row.requester_kind as ApprovalRequest["requesterKind"],
      orgId: row.org_id as string,
      reason: row.reason as string,
      scopeSummary: row.scope_summary as string,
      riskCostEstimate: (row.risk_cost_estimate as string) ?? undefined,
      policyDecisionId: (row.policy_decision_id as string) ?? undefined,
      taskId: (row.task_id as string) ?? undefined,
      runId: (row.run_id as string) ?? undefined,
      actionRequestSnapshot: JSON.parse((row.action_request_snapshot as string) ?? "null"),
      type: row.type as ApprovalRequest["type"],
      status: row.status as ApprovalStatus,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      requiredApproverIds: row.required_approver_ids
        ? (JSON.parse(row.required_approver_ids as string) as string[])
        : undefined,
    };
  }

  async getRequest(id: string): Promise<ApprovalRequest | null> {
    const row = this.db.prepare("SELECT * FROM approval_requests WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const request = this.rowToRequest(row);
    if (request.status === "pending" && new Date(request.expiresAt) <= new Date()) {
      request.status = "expired";
      request.updatedAt = now();
      this.db.prepare("UPDATE approval_requests SET status = ?, updated_at = ? WHERE id = ?").run("expired", request.updatedAt, id);
    }
    return request;
  }

  async listRequests(filter: {
    orgId?: string;
    requesterId?: string;
    status?: ApprovalStatus;
    limit?: number;
  }): Promise<ApprovalRequest[]> {
    let sql = "SELECT * FROM approval_requests WHERE 1=1";
    const params: unknown[] = [];
    if (filter.orgId) {
      sql += " AND org_id = ?";
      params.push(filter.orgId);
    }
    if (filter.requesterId) {
      sql += " AND requester_id = ?";
      params.push(filter.requesterId);
    }
    if (filter.status) {
      sql += " AND status = ?";
      params.push(filter.status);
    }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(filter.limit ?? 50);
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToRequest(r));
  }

  async decide(
    approvalRequestId: string,
    decision: "approved" | "denied",
    approverId: string,
    approverKind: "user" | "service",
    reason?: string
  ): Promise<{ request: ApprovalRequest; decision: ApprovalDecision } | null> {
    const request = await this.getRequest(approvalRequestId);
    if (!request || request.status !== "pending") return null;
    if (new Date(request.expiresAt) <= new Date()) return null;
    const decisionId = newId("apd");
    const ts = now();
    const decisionRecord: ApprovalDecision = {
      id: decisionId,
      approvalRequestId,
      decision,
      approverId,
      approverKind,
      reason,
      decidedAt: ts,
    };
    this.db.prepare(
      "INSERT INTO approval_decisions (id, approval_request_id, decision, approver_id, approver_kind, reason, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(decisionId, approvalRequestId, decision, approverId, approverKind, reason ?? null, ts);
    this.db.prepare("UPDATE approval_requests SET status = ?, updated_at = ? WHERE id = ?").run(
      decision === "approved" ? "approved" : "denied",
      ts,
      approvalRequestId
    );
    request.status = decision === "approved" ? "approved" : "denied";
    request.updatedAt = ts;
    return { request, decision: decisionRecord };
  }

  async getDecisionByRequestId(approvalRequestId: string): Promise<ApprovalDecision | null> {
    const row = this.db
      .prepare("SELECT * FROM approval_decisions WHERE approval_request_id = ? ORDER BY decided_at DESC LIMIT 1")
      .get(approvalRequestId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      approvalRequestId: row.approval_request_id as string,
      decision: row.decision as "approved" | "denied",
      approverId: row.approver_id as string,
      approverKind: row.approver_kind as "user" | "service",
      reason: (row.reason as string) ?? undefined,
      decidedAt: row.decided_at as string,
    };
  }
}
