/**
 * In-memory approval request and decision store.
 * Schema-ready for Postgres later.
 */
import type { ApprovalRequest, ApprovalDecision, ApprovalStatus } from '@vouch/types';
import * as crypto from 'node:crypto';

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface CreateApprovalRequestInput {
  requesterId: string;
  requesterKind: 'agent' | 'user' | 'service';
  orgId: string;
  reason: string;
  scopeSummary: string;
  riskCostEstimate?: string;
  policyDecisionId?: string;
  taskId?: string;
  runId?: string;
  actionRequestSnapshot: unknown;
  type?: ApprovalRequest['type'];
  /** TTL in seconds (default 24h) */
  expiresInSeconds?: number;
  requiredApproverIds?: string[];
}

export class ApprovalStore {
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly decisions = new Map<string, ApprovalDecision>();

  async createRequest(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    const id = newId('apr');
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
      type: input.type ?? 'one_time',
      status: 'pending',
      expiresAt,
      createdAt: ts,
      updatedAt: ts,
      requiredApproverIds: input.requiredApproverIds,
    };
    this.requests.set(id, request);
    return request;
  }

  async getRequest(id: string): Promise<ApprovalRequest | null> {
    const req = this.requests.get(id) ?? null;
    if (req && req.status === 'pending' && new Date(req.expiresAt) <= new Date()) {
      req.status = 'expired';
      req.updatedAt = now();
    }
    return req;
  }

  async listRequests(filter: {
    orgId?: string;
    requesterId?: string;
    status?: ApprovalStatus;
    limit?: number;
  }): Promise<ApprovalRequest[]> {
    let list = Array.from(this.requests.values());
    if (filter.orgId) list = list.filter((r) => r.orgId === filter.orgId);
    if (filter.requesterId) list = list.filter((r) => r.requesterId === filter.requesterId);
    if (filter.status) list = list.filter((r) => r.status === filter.status);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = filter.limit ?? 50;
    return list.slice(0, limit);
  }

  async decide(
    approvalRequestId: string,
    decision: 'approved' | 'denied',
    approverId: string,
    approverKind: 'user' | 'service',
    reason?: string
  ): Promise<{ request: ApprovalRequest; decision: ApprovalDecision } | null> {
    const request = await this.getRequest(approvalRequestId);
    if (!request || request.status !== 'pending') return null;
    if (new Date(request.expiresAt) <= new Date()) {
      request.status = 'expired';
      request.updatedAt = now();
      return null;
    }
    const decisionId = newId('apd');
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
    this.decisions.set(decisionId, decisionRecord);
    request.status = decision === 'approved' ? 'approved' : 'denied';
    request.updatedAt = ts;
    return { request, decision: decisionRecord };
  }

  async getDecisionByRequestId(approvalRequestId: string): Promise<ApprovalDecision | null> {
    const decisions = Array.from(this.decisions.values()).filter(
      (d) => d.approvalRequestId === approvalRequestId
    );
    return decisions.length > 0 ? decisions[0]! : null;
  }
}
