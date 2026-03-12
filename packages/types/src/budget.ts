/**
 * Budget and spend layer: limits, usage, and spend records.
 */

export type BudgetScope = "agent" | "task" | "workspace" | "org";

export interface Budget {
  id: string;
  scope: BudgetScope;
  /** Agent id, task id, workspace id, or org id */
  scopeId: string;
  /** Human-readable label */
  label?: string;
  /** Limit in smallest currency unit or abstract units (e.g. cents, API call count) */
  limitUnits: number;
  /** Current usage in same units */
  currentUsage: number;
  /** Reset policy: "never" | "daily" | "weekly" | "monthly" | "per_task" */
  resetPolicy: "never" | "daily" | "weekly" | "monthly" | "per_task";
  /** Last reset at (ISO 8601) */
  lastResetAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpendRecord {
  id: string;
  budgetId: string;
  /** Amount in same units as budget */
  amount: number;
  /** Task id for lineage */
  taskId?: string;
  runId?: string;
  /** Approval id if spend was approved */
  approvalId?: string;
  /** Merchant or provider (e.g. "api.openai.com", "stripe") */
  merchant?: string;
  /** Optional product/category */
  productCategory?: string;
  createdAt: string;
}
