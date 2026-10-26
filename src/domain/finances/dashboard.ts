import type { FinanceData } from "@/features/finances/types";
export function parseCents(value: string) {
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Informe um valor em reais com até duas casas, sem separador de milhares.",
    );
  const [whole, fraction = ""] = value.trim().replace(",", ".").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > 999999999999n)
    throw new Error(
      "Informe um valor maior que zero e até R$ 9.999.999.999,99.",
    );
  return Number(cents);
}
export function money(value: bigint | number) {
  const cents = BigInt(value),
    abs = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "−" : ""}R$ ${new Intl.NumberFormat("pt-BR").format(abs / 100n)},${String(abs % 100n).padStart(2, "0")}`;
}
export function moneyInput(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
export function shiftMonth(month: string, delta: number) {
  const d = new Date(month.slice(0, 7) + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}
export function financeDashboard(
  data: FinanceData,
  month: string,
  today: string,
) {
  const valid = data.transactions.filter(
    (t) => !t.is_deleted && t.status === "REALIZED" && t.booked_on <= today,
  );
  const totals = (period: string) => {
    const rows = valid.filter((t) => t.booked_on.startsWith(period));
    const sum = (kind: string) =>
      rows
        .filter((t) => t.kind === kind)
        .reduce((n, t) => n + BigInt(t.amount_cents), 0n);
    const income = sum("INCOME"),
      expenses = sum("EXPENSE");
    return { income, expenses, balance: income - expenses };
  };
  const current = totals(month),
    previous = totals(shiftMonth(month, -1));
  const categories = data.categories
    .filter((c) => c.kind === "EXPENSE")
    .map((c) => ({
      ...c,
      spent: valid
        .filter(
          (t) =>
            t.kind === "EXPENSE" &&
            t.category_id === c.id &&
            t.booked_on.startsWith(month),
        )
        .reduce((n, t) => n + BigInt(t.amount_cents), 0n),
    }))
    .sort((a, b) => (a.spent > b.spent ? -1 : a.spent < b.spent ? 1 : 0));
  const contributions = data.contributions.filter(
    (c) => !c.is_deleted && c.recorded_on <= today,
  );
  return {
    ...current,
    previous,
    categories,
    history: Array.from({ length: 6 }, (_, i) => {
      const date = shiftMonth(month, i - 5);
      return { date, ...totals(date) };
    }),
    goals: data.goals
      .filter((g) => !g.archived)
      .map((g) => ({
        ...g,
        saved: contributions
          .filter((c) => c.goal_id === g.id)
          .reduce((n, c) => n + BigInt(c.amount_cents), 0n),
      })),
    planned: data.transactions
      .filter((t) => !t.is_deleted && t.status === "PLANNED")
      .sort((a, b) => a.booked_on.localeCompare(b.booked_on)),
  };
}
export function monthlyChange(current: bigint, previous: bigint) {
  if (previous === 0n) return null;
  return (
    Number(
      ((current - previous) * 10000n) / (previous < 0n ? -previous : previous),
    ) / 100
  );
}
