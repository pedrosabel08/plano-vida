import type { OwnedEntry } from "@/features/studies/types";
export type FinanceCategory = OwnedEntry & {
  title: string;
  kind: "INCOME" | "EXPENSE";
  archived: boolean;
};
export type FinanceTransaction = OwnedEntry & {
  category_id: string;
  kind: "INCOME" | "EXPENSE";
  description: string;
  amount_cents: number;
  booked_on: string;
  status: "PLANNED" | "REALIZED";
  is_deleted: boolean;
};
export type FinanceBudget = OwnedEntry & {
  category_id: string;
  month: string;
  limit_cents: number;
};
export type FinanceGoal = OwnedEntry & {
  title: string;
  target_cents: number;
  due_on: string | null;
  objective_id: string | null;
  archived: boolean;
};
export type FinanceContribution = OwnedEntry & {
  goal_id: string;
  amount_cents: number;
  recorded_on: string;
  is_deleted: boolean;
};
export type FinanceData = {
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
  goals: FinanceGoal[];
  contributions: FinanceContribution[];
};
