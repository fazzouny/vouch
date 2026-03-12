/**
 * Approval and escalation layer: request, decision, and types.
 */

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "cancelled";

export type ApprovalType =
  | "one_time"
  | "recurring"
  | "budget"
  | "step_up"
  | "dual"
  | "break_glass";

export interface ApprovalRequest {
  id: string;
  /** Agent or user that requested the action */
  requesterId: string;
  requesterKind: "agent" | "user" | "service";
  orgId: string;
  /** Why the action is needed */
  reason: string;
  /** Scope summary (e.g. "send_email", "rest:https://api.example.com") */
  scopeSummary: string;
  /** Risk or cost estimate for display */
  riskCostEstimate?: string;
  /** Optional policy decision id that triggered this approval */
  policyDecisionId?: string;
  /** Task/run context for audit */
  taskId?: string;
  runId?: string;
  /** Action request snapshot (for re-minting grant after approve) */
  actionRequestSnapshot: unknown;
  type: ApprovalType;
  status: ApprovalStatus;
  /** Expiry (ISO 8601); after this, status becomes expired */
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  /** Optional: second approver required (dual approval) */
  requiredApproverIds?: string[];
}

export interface ApprovalDecision {
  id: string;
  approvalRequestId: string;
  decision: "approved" | "denied";
  approverId: string;
  approverKind: "user" | "service";
  reason?: string;
  decidedAt: string;
}
