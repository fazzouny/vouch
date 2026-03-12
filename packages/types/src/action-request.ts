/**
 * Action request: input to delegation and policy evaluation.
 * Used when an agent requests authority to perform an action.
 */

export interface ActionRequest {
  /** Intended action or tool name (e.g. mcp:invoke, api:post) */
  intendedAction: string;
  /** Target system (e.g. mcp, api, a2a, browser, payment) */
  targetSystem: string;
  /** Scope description or resource path (e.g. /api/users, mcp-server-id) */
  scope: string;
  /** Optional task id for audit lineage */
  taskId?: string;
  /** Optional run id for audit lineage */
  runId?: string;
  /** On-behalf-of identity (user id, role, or department) */
  onBehalfOf?: string;
  /** Optional cost estimate for budget/approval (in budget units) */
  costEstimate?: number;
  /** Optional tool type for policy (e.g. mcp, api) */
  toolType?: string;
  /** Optional resource or path constraints */
  resources?: string[];
}
