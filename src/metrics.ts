/**
 * In-memory counters for delegation, execution, and approval. Exposed as Prometheus text format.
 */
const counters: Record<string, number> = {
  vouch_delegation_total: 0,
  vouch_delegation_allowed: 0,
  vouch_delegation_denied: 0,
  vouch_delegation_require_approval: 0,
  vouch_execution_total: 0,
  vouch_execution_success: 0,
  vouch_execution_failure: 0,
  vouch_approval_decisions_total: 0,
  vouch_approval_approved: 0,
  vouch_approval_denied: 0,
};

export function recordDelegation(result: "allow" | "deny" | "require_approval"): void {
  counters.vouch_delegation_total += 1;
  if (result === "allow") counters.vouch_delegation_allowed += 1;
  else if (result === "deny") counters.vouch_delegation_denied += 1;
  else counters.vouch_delegation_require_approval += 1;
}

export function recordExecution(success: boolean): void {
  counters.vouch_execution_total += 1;
  if (success) counters.vouch_execution_success += 1;
  else counters.vouch_execution_failure += 1;
}

export function recordApprovalDecision(decision: "approved" | "denied"): void {
  counters.vouch_approval_decisions_total += 1;
  if (decision === "approved") counters.vouch_approval_approved += 1;
  else counters.vouch_approval_denied += 1;
}

export function getPrometheusText(): string {
  const lines: string[] = [
    "# HELP vouch_delegation_total Total delegation requests",
    "# TYPE vouch_delegation_total counter",
    `vouch_delegation_total ${counters.vouch_delegation_total}`,
    "# HELP vouch_delegation_allowed Delegations allowed",
    "# TYPE vouch_delegation_allowed counter",
    `vouch_delegation_allowed ${counters.vouch_delegation_allowed}`,
    "# HELP vouch_delegation_denied Delegations denied",
    "# TYPE vouch_delegation_denied counter",
    `vouch_delegation_denied ${counters.vouch_delegation_denied}`,
    "# HELP vouch_delegation_require_approval Delegations requiring approval",
    "# TYPE vouch_delegation_require_approval counter",
    `vouch_delegation_require_approval ${counters.vouch_delegation_require_approval}`,
    "# HELP vouch_execution_total Total executions",
    "# TYPE vouch_execution_total counter",
    `vouch_execution_total ${counters.vouch_execution_total}`,
    "# HELP vouch_execution_success Successful executions",
    "# TYPE vouch_execution_success counter",
    `vouch_execution_success ${counters.vouch_execution_success}`,
    "# HELP vouch_execution_failure Failed executions",
    "# TYPE vouch_execution_failure counter",
    `vouch_execution_failure ${counters.vouch_execution_failure}`,
    "# HELP vouch_approval_decisions_total Total approval decisions",
    "# TYPE vouch_approval_decisions_total counter",
    `vouch_approval_decisions_total ${counters.vouch_approval_decisions_total}`,
    "# HELP vouch_approval_approved Approvals granted",
    "# TYPE vouch_approval_approved counter",
    `vouch_approval_approved ${counters.vouch_approval_approved}`,
    "# HELP vouch_approval_denied Approvals denied",
    "# TYPE vouch_approval_denied counter",
    `vouch_approval_denied ${counters.vouch_approval_denied}`,
  ];
  return lines.join("\n") + "\n";
}
