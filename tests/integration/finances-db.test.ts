import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite, area: string, category: string;
const as = (sql: string, args: unknown[] = [], owner = A) =>
  asUser(db, owner, sql, args);
const save = (
  name: string,
  item: unknown,
  id = crypto.randomUUID(),
  expected?: unknown,
) =>
  as(`select public.save_finance_${name}($1,$2,$3) as id`, [
    item,
    id,
    expected || null,
  ]);
beforeAll(async () => {
  db = await readingDatabase();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("truncate auth.users cascade");
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
  area = (
    await as("select public.create_area('Dinheiro','wallet','#F27DA4') as id")
  ).rows[0].id as string;
  category = crypto.randomUUID();
  await save(
    "category",
    { area_id: area, title: "Casa", kind: "EXPENSE", archived: false },
    category,
  );
});
const transaction = () => ({
  area_id: area,
  category_id: category,
  kind: "EXPENSE",
  description: "Aluguel",
  amount_cents: 100001,
  booked_on: "2026-10-20",
  status: "REALIZED",
  is_deleted: false,
});
it("persists cents, separate budgets, planned transactions and explicit goal contributions", async () => {
  await save("transaction", transaction());
  await save("transaction", {
    ...transaction(),
    booked_on: "2099-01-01",
    status: "PLANNED",
  });
  await save("budget", {
    area_id: area,
    category_id: category,
    month: "2026-10-01",
    limit_cents: 200000,
  });
  const goal = crypto.randomUUID();
  await save(
    "goal",
    {
      area_id: area,
      title: "Reserva",
      target_cents: 1000000,
      due_on: null,
      objective_id: null,
      archived: false,
    },
    goal,
  );
  await save("contribution", {
    area_id: area,
    goal_id: goal,
    amount_cents: 12345,
    recorded_on: "2026-10-20",
    is_deleted: false,
  });
  const d = (await as("select public.get_finance_data($1) as data", [area]))
    .rows[0].data as { transactions: unknown[]; contributions: unknown[] };
  expect(d.transactions).toHaveLength(2);
  expect(d.contributions).toMatchObject([{ amount_cents: 12345 }]);
  expect(
    (await db.query("select * from public.goal_records")).rows,
  ).toHaveLength(0);
});
it("isolates owners, validates category kind, month boundaries, positive cents and future realized", async () => {
  expect(
    (await as("select public.get_finance_data($1) as data", [area], B)).rows[0]
      .data,
  ).toMatchObject({ transactions: [], categories: [] });
  await expect(
    as(
      "select public.save_finance_transaction($1,$2)",
      [transaction(), crypto.randomUUID()],
      B,
    ),
  ).rejects.toThrow();
  for (const patch of [
    { kind: "INCOME" },
    { amount_cents: 0 },
    { amount_cents: 1.1 },
    { booked_on: "2099-01-01" },
  ])
    await expect(
      save("transaction", { ...transaction(), ...patch }),
    ).rejects.toThrow();
  await expect(
    save("budget", {
      area_id: area,
      category_id: category,
      month: "2026-10-02",
      limit_cents: 100,
    }),
  ).rejects.toThrow();
});
it("guards retries, edits, logical removal and immutable category kind while in use", async () => {
  const id = crypto.randomUUID(),
    p = transaction();
  await save("transaction", p, id);
  await save("transaction", p, id);
  await expect(
    save("transaction", { ...p, amount_cents: 100002 }, id),
  ).rejects.toMatchObject({ code: "22023" });
  const row = (
    await as("select * from public.finance_transactions where id=$1", [id])
  ).rows[0];
  await save("transaction", { ...p, is_deleted: true }, id, row.updated_at);
  await expect(
    save("transaction", p, id, row.updated_at),
  ).rejects.toMatchObject({ code: "40001" });
  const cat = (
    await as("select * from public.finance_categories where id=$1", [category])
  ).rows[0];
  await expect(
    save(
      "category",
      { area_id: area, title: "Casa", kind: "INCOME", archived: false },
      category,
      cat.updated_at,
    ),
  ).rejects.toMatchObject({ code: "23503" });
});
