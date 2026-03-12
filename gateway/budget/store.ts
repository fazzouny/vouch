/**
 * In-memory budget and spend store.
 * Check before grant/execution; record spend after execution.
 */
import type { Budget, SpendRecord, BudgetScope } from '@vouch/types';
import * as crypto from 'node:crypto';

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export interface CreateBudgetInput {
  scope: BudgetScope;
  scopeId: string;
  label?: string;
  limitUnits: number;
  resetPolicy?: Budget['resetPolicy'];
}

export class BudgetStore {
  private readonly budgets = new Map<string, Budget>();
  private readonly spendRecords = new Map<string, SpendRecord>();

  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const id = newId('budget');
    const ts = now();
    const budget: Budget = {
      id,
      scope: input.scope,
      scopeId: input.scopeId,
      label: input.label,
      limitUnits: input.limitUnits,
      currentUsage: 0,
      resetPolicy: input.resetPolicy ?? 'never',
      createdAt: ts,
      updatedAt: ts,
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async getBudget(id: string): Promise<Budget | null> {
    return this.budgets.get(id) ?? null;
  }

  async getByScope(scope: BudgetScope, scopeId: string): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (b) => b.scope === scope && b.scopeId === scopeId
    );
  }

  /** Returns true if adding amount would stay within limit (or no budget exists for scope). */
  async checkWithinBudget(
    scope: BudgetScope,
    scopeId: string,
    amount: number
  ): Promise<{ allowed: boolean; budget?: Budget; reason?: string }> {
    const budgets = await this.getByScope(scope, scopeId);
    if (budgets.length === 0) return { allowed: true };
    for (const budget of budgets) {
      if (budget.currentUsage + amount > budget.limitUnits) {
        return {
          allowed: false,
          budget,
          reason: `Budget ${budget.id} would exceed limit (${budget.currentUsage + amount} > ${budget.limitUnits})`,
        };
      }
    }
    return { allowed: true };
  }

  async recordSpend(input: {
    budgetId: string;
    amount: number;
    taskId?: string;
    runId?: string;
    approvalId?: string;
    merchant?: string;
    productCategory?: string;
  }): Promise<SpendRecord | null> {
    const budget = await this.getBudget(input.budgetId);
    if (!budget) return null;
    const id = newId('spend');
    const ts = now();
    const record: SpendRecord = {
      id,
      budgetId: input.budgetId,
      amount: input.amount,
      taskId: input.taskId,
      runId: input.runId,
      approvalId: input.approvalId,
      merchant: input.merchant,
      productCategory: input.productCategory,
      createdAt: ts,
    };
    this.spendRecords.set(id, record);
    budget.currentUsage += input.amount;
    budget.updatedAt = ts;
    return record;
  }

  async listSpendRecords(budgetId: string, limit = 100): Promise<SpendRecord[]> {
    const list = Array.from(this.spendRecords.values())
      .filter((r) => r.budgetId === budgetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.slice(0, limit);
  }
}
