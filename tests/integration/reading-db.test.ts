import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite;
let area: string, mid: string, book: string;
const as = (sql: string, args: unknown[] = [], id = A) =>
  asUser(db, id, sql, args);
const data = (extra = {}) => ({
  title: "Livro teste",
  authors: ["Autor teste"],
  total_pages: 300,
  initial_tracking_page: 0,
  status: "READING",
  ...extra,
});
const goalData = {
  title: "Ler 70 páginas",
  type: "QUANTITY",
  unit: "páginas",
  target: "70",
  basis: "WEEKLY",
  frequency_mode: "OCCURRENCES",
  expected_observations: 7,
  observation_unit: "dias",
  state: "ACTIVE",
  objective_id: null,
};
async function log(pages = 20, extra = {}, id: string | null = null) {
  return (
    await as("select public.save_reading_log($1,$2,$3) as id", [
      book,
      {
        pages,
        read_on: "2026-10-20",
        operation_id: crypto.randomUUID(),
        ...extra,
      },
      id,
    ])
  ).rows[0].id as string;
}
async function goal(scope: string | null = null) {
  return (
    await as("select public.save_reading_goal($1,$2,$3,$4) as id", [
      "2026-10-19",
      area,
      goalData,
      scope,
    ])
  ).rows[0].id as string;
}
async function current() {
  return (
    (await as("select public.get_reading_books() as b")).rows[0].b as {
      current_page: number;
    }[]
  )[0].current_page;
}
beforeAll(async () => {
  db = await readingDatabase();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("reset role;truncate auth.users cascade;");
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
  area = (
    await as(
      "select public.create_area('Minha biblioteca','book-open','#F4BD55') as id",
    )
  ).rows[0].id as string;
  mid = (await as("select public.set_reading_module($1) as id", [area])).rows[0]
    .id as string;
  book = (
    await as("select public.save_reading_book($1,$2) as id", [mid, data()])
  ).rows[0].id as string;
});
it("derives progress from canonical reading logs and stores no current_page column", async () => {
  await log(20);
  await log(36);
  expect(await current()).toBe(56);
  expect(
    (
      await db.query(
        "select column_name from information_schema.columns where table_name='books' and column_name='current_page'",
      )
    ).rows,
  ).toHaveLength(0);
});
it("does not count the initial page as weekly execution", async () => {
  const b = (
    await as("select public.save_reading_book($1,$2) as id", [
      mid,
      data({ initial_tracking_page: 120 }),
    ])
  ).rows[0].id;
  await as("select public.save_reading_log($1,$2)", [
    b,
    { pages: 8, read_on: "2026-10-20", operation_id: crypto.randomUUID() },
  ]);
  const p = (await as("select public.get_planning_data('2026-10-19') as p"))
    .rows[0].p as { reading_logs: { pages: number }[] };
  await goal();
  const p2 = (await as("select public.get_planning_data('2026-10-19') as p"))
    .rows[0].p as typeof p;
  expect(p.reading_logs).toHaveLength(0);
  expect(p2.reading_logs.map((l) => l.pages)).toEqual([8]);
});
it("creates MODULE source without manual mirror", async () => {
  const g = await goal();
  await log(56);
  expect((await as("select * from public.goal_records")).rows).toHaveLength(0);
  expect(
    (
      await as(
        "select kind,module,metric,scope from public.goal_sources where goal_id=$1",
        [g],
      )
    ).rows[0],
  ).toMatchObject({
    kind: "MODULE",
    module: "READING",
    metric: "PAGES_READ",
    scope: "ALL_BOOKS",
  });
});
it("requires exactly one owned Book for every ReadingLog in the actual schema", async () => {
  expect(
    (
      await db.query<{ is_nullable: string }>(
        "select is_nullable from information_schema.columns where table_schema='public' and table_name='reading_logs' and column_name='book_id'",
      )
    ).rows[0].is_nullable,
  ).toBe("NO");
  const constraints = (
    await db.query<{ definition: string }>(
      "select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.reading_logs'::regclass and contype='f'",
    )
  ).rows;
  expect(
    constraints.some((c) =>
      /FOREIGN KEY \(user_id, book_id\) REFERENCES books\(user_id, id\)/.test(
        c.definition,
      ),
    ),
  ).toBe(true);
  await expect(
    as("select public.save_reading_log(null,$1)", [
      { pages: 21, read_on: "2026-10-20", operation_id: crypto.randomUUID() },
    ]),
  ).rejects.toThrow();
  await expect(
    as(
      "insert into public.reading_logs(book_id,read_on,pages,operation_id) values(null,'2026-10-20',21,$1)",
      [crypto.randomUUID()],
    ),
  ).rejects.toThrow();
  await log(21);
  expect(
    (
      await as(
        "select l.id from public.reading_logs l join public.books b on (b.user_id,b.id)=(l.user_id,l.book_id)",
      )
    ).rows,
  ).toHaveLength(1);
});
it("rejects any manual measurement of a MODULE goal, including direct inserts", async () => {
  const g = await goal();
  await expect(
    as("select public.save_goal_record($1,$2)", [
      g,
      {
        value: "56",
        completed: null,
        recorded_on: "2026-10-20",
        operation_id: crypto.randomUUID(),
      },
    ]),
  ).rejects.toThrow();
  await expect(
    as(
      "insert into public.goal_records(goal_id,goal_type,recorded_on,value,operation_id) values($1,'QUANTITY','2026-10-20',56,$2)",
      [g, crypto.randomUUID()],
    ),
  ).rejects.toThrow();
});
it("permits retries exactly once and rejects changed payload", async () => {
  const op = crypto.randomUUID();
  const id = await log(12, { operation_id: op });
  expect(await log(12, { operation_id: op })).toBe(id);
  expect(await current()).toBe(12);
  await expect(log(13, { operation_id: op })).rejects.toThrow();
});
it("corrects 80 to 8 and removes logically", async () => {
  const id = await log(80);
  let row = (await as("select * from public.reading_logs where id=$1", [id]))
    .rows[0];
  await log(8, { expected_updated_at: row.updated_at }, id);
  expect(await current()).toBe(8);
  row = (await as("select * from public.reading_logs where id=$1", [id]))
    .rows[0];
  await log(8, { expected_updated_at: row.updated_at, is_deleted: true }, id);
  expect(await current()).toBe(0);
  expect(
    (await as("select is_deleted from public.reading_logs")).rows[0].is_deleted,
  ).toBe(true);
});
it("rejects stale corrections", async () => {
  const id = await log(8);
  await expect(
    log(9, { expected_updated_at: "2026-01-01T00:00:00Z" }, id),
  ).rejects.toThrow();
});
it("rejects excess, negative, zero and fractional pages", async () => {
  for (const n of [301, 0, -1, 1.5]) await expect(log(n)).rejects.toThrow();
  expect(await current()).toBe(0);
});
it("rejects metadata changes below derived progress and supports unknown total", async () => {
  await log(56);
  const row = (await as("select * from public.books")).rows[0];
  await expect(
    as("select public.save_reading_book($1,$2,$3)", [
      mid,
      data({ total_pages: 50, expected_updated_at: row.updated_at }),
      book,
    ]),
  ).rejects.toThrow();
  await as("select public.save_reading_book($1,$2,$3)", [
    mid,
    data({ total_pages: null, expected_updated_at: row.updated_at }),
    book,
  ]);
  expect(await current()).toBe(56);
});
it("rejects initial page above total", async () => {
  await expect(
    as("select public.save_reading_book($1,$2)", [
      mid,
      data({ initial_tracking_page: 301 }),
    ]),
  ).rejects.toThrow();
});
it("never silently finishes or resets a book", async () => {
  await log(300);
  expect((await as("select status from public.books")).rows[0].status).toBe(
    "READING",
  );
  expect(await current()).toBe(300);
});
it("retains manual goals and disallows converting manual historical records", async () => {
  const g = (
    await as("select public.save_weekly_goal($1,$2,$3) as id", [
      "2026-10-19",
      area,
      goalData,
    ])
  ).rows[0].id;
  await as("select public.save_goal_record($1,$2)", [
    g,
    {
      value: "56",
      completed: null,
      recorded_on: "2026-10-20",
      operation_id: crypto.randomUUID(),
    },
  ]);
  const row = (await as("select * from public.weekly_goals where id=$1", [g]))
    .rows[0];
  await expect(
    as("select public.save_reading_goal($1,$2,$3,$4,$5)", [
      "2026-10-19",
      area,
      { ...goalData, expected_updated_at: row.updated_at },
      null,
      g,
    ]),
  ).rejects.toThrow();
  expect(
    (await as("select kind from public.goal_sources where goal_id=$1", [g]))
      .rows[0].kind,
  ).toBe("MANUAL");
});
it("locks a module source and protects its quantity/pages configuration", async () => {
  const g = await goal();
  await expect(
    as(
      "update public.goal_sources set kind='MANUAL',module=null,metric=null,scope=null,area_module_id=null where goal_id=$1",
      [g],
    ),
  ).rejects.toThrow();
  await expect(
    as("update public.weekly_goals set type='AVERAGE' where id=$1", [g]),
  ).rejects.toThrow();
});
it("isolates every specialized entity and configuration", async () => {
  await log();
  await as(
    "insert into public.external_book_references(book_id,provider,external_id,looked_up_at) values($1,'OPEN_LIBRARY','/works/OL1W',now())",
    [book],
  );
  for (const t of [
    "area_modules",
    "books",
    "reading_logs",
    "external_book_references",
  ])
    expect((await as("select * from public." + t, [], B)).rows).toHaveLength(0);
});
it("rejects cross-owner book/log/reference/module/scope relationships", async () => {
  await expect(
    as("select public.set_reading_module($1)", [area], B),
  ).rejects.toThrow();
  await expect(
    as("select public.save_reading_book($1,$2)", [mid, data()], B),
  ).rejects.toThrow();
  await expect(
    as(
      "insert into public.reading_logs(book_id,read_on,pages,operation_id) values($1,'2026-10-20',12,$2)",
      [book, crypto.randomUUID()],
      B,
    ),
  ).rejects.toThrow();
  await expect(
    as(
      "insert into public.external_book_references(book_id,provider,external_id,looked_up_at) values($1,'OPEN_LIBRARY','/works/OL1W',now())",
      [book],
      B,
    ),
  ).rejects.toThrow();
  const foreignArea = (
    await as("select public.create_area('Outra','leaf','#47D6C7') as id", [], B)
  ).rows[0].id;
  const foreignMid = (
    await as("select public.set_reading_module($1) as id", [foreignArea], B)
  ).rows[0].id;
  const foreignBook = (
    await as(
      "select public.save_reading_book($1,$2) as id",
      [foreignMid, data()],
      B,
    )
  ).rows[0].id;
  await expect(goal(foreignBook as string)).rejects.toThrow();
});
it("rejects scope from another owned area and permits disabling without deleting history", async () => {
  const other = (
    await as("select public.create_area('Outra','leaf','#47D6C7') as id")
  ).rows[0].id;
  const om = (await as("select public.set_reading_module($1) as id", [other]))
    .rows[0].id;
  const ob = (
    await as("select public.save_reading_book($1,$2) as id", [om, data()])
  ).rows[0].id;
  await expect(goal(ob as string)).rejects.toThrow();
  await log(20);
  await goal();
  await as("select public.set_reading_module($1,false)", [area]);
  await expect(log()).rejects.toThrow();
  expect(await current()).toBe(20);
});
it("blocks anonymous tables and RPCs", async () => {
  await db.exec("set role anon");
  try {
    for (const t of [
      "area_modules",
      "books",
      "reading_logs",
      "external_book_references",
    ])
      await expect(db.query("select * from public." + t)).rejects.toThrow();
    await expect(
      db.query("select public.get_reading_books()"),
    ).rejects.toThrow();
  } finally {
    await db.exec("reset role");
  }
});
it("protects ownership, timestamps and context columns", async () => {
  await expect(as("update public.books set user_id=$1", [B])).rejects.toThrow();
  await expect(
    as("update public.reading_logs set created_at=now()"),
  ).rejects.toThrow();
  await expect(as("delete from public.books")).rejects.toThrow();
});
