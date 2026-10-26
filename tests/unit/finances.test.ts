import { it, expect } from "vitest";
import {
  parseCents,
  money,
  financeDashboard,
  shiftMonth,
  monthlyChange,
} from "@/domain/finances/dashboard";
import type {
  FinanceData,
  FinanceTransaction,
} from "@/features/finances/types";
it("parses BRL exactly and rejects ambiguous rounding and separators", () => {
  expect(parseCents("0,10") + parseCents("0.20")).toBe(30);
  expect(money(123456n)).toBe("R$ 1.234,56");
  expect(money(-5n)).toBe("−R$ 0,05");
  for (const input of ["1.234,56", "1,001", "1e3", "-1", "0", "Infinity"])
    expect(() => parseCents(input)).toThrow();
});
it("uses only realized local-month movements, no inferred contributions, prior month and exact totals", () => {
  const t = (
    date: string,
    kind: string,
    amount: number,
    status = "REALIZED",
    deleted = false,
  ) =>
    ({
      booked_on: date,
      kind,
      amount_cents: amount,
      status,
      is_deleted: deleted,
      category_id: "c",
    }) as FinanceTransaction;
  const data = {
    categories: [{ id: "c", kind: "EXPENSE", title: "Casa" }],
    transactions: [
      t("2026-10-01", "INCOME", 100),
      t("2026-10-25", "EXPENSE", 30),
      t("2026-11-01", "EXPENSE", 20),
      t("2026-10-20", "EXPENSE", 50, "PLANNED"),
      t("2026-10-21", "EXPENSE", 10, "REALIZED", true),
      t("2026-09-30", "INCOME", 50),
    ],
    goals: [{ id: "g", target_cents: 1000, archived: false }],
    contributions: [],
    budgets: [],
  } as unknown as FinanceData;
  const d = financeDashboard(data, "2026-10", "2026-10-25");
  expect(d.income).toBe(100n);
  expect(d.expenses).toBe(30n);
  expect(d.balance).toBe(70n);
  expect(d.previous.income).toBe(50n);
  expect(d.goals[0].saved).toBe(0n);
  expect(d.categories[0].spent).toBe(30n);
  expect(d.planned).toHaveLength(1);
  expect(monthlyChange(100n, 50n)).toBe(100);
  expect(monthlyChange(100n, 0n)).toBe(null);
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
});
