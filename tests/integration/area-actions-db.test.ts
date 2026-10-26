import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite, area: string, book: string;
const as = (sql: string, args: unknown[] = [], owner = A) =>
  asUser(db, owner, sql, args);
beforeAll(async () => {
  db = await readingDatabase();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("reset role;truncate auth.users cascade;");
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
  area = (
    await as("select public.create_area('Leitura','book-open','#F4BD55') as id")
  ).rows[0].id as string;
  const moduleId = (
    await as("select public.set_reading_module($1) as id", [area])
  ).rows[0].id;
  book = (
    await as("select public.save_reading_book($1,$2) as id", [
      moduleId,
      {
        title: "Livro",
        authors: [],
        status: "READING",
        total_pages: 300,
        initial_tracking_page: 0,
      },
    ])
  ).rows[0].id as string;
});
const payload = (extra = {}) => ({
  area_id: area,
  title: "Ler capítulo",
  book_id: book,
  objective_id: "",
  due_on: "2026-10-25",
  due_time: "20:00",
  completed: false,
  ...extra,
});
async function create(extra = {}, id = crypto.randomUUID()) {
  await as("select public.save_area_action($1,$2)", [payload(extra), id]);
  return id;
}
it("persists book/date/time, orders pending actions, and completing writes no pages or goal records", async () => {
  const id = await create();
  const items = (
    await as("select public.get_area_actions($1) as items", [area])
  ).rows[0].items as { id: string; updated_at: string }[];
  expect(items[0]).toMatchObject({
    id,
    book_id: book,
    due_on: "2026-10-25",
    due_time: "20:00:00",
    completed: false,
  });
  await as("select public.complete_area_action($1,true,$2)", [
    id,
    items[0].updated_at,
  ]);
  const result = (
    await as("select public.get_area_actions($1) as items", [area])
  ).rows[0].items as { completed: boolean }[];
  expect(result[0].completed).toBe(true);
  expect(
    (await db.query("select * from public.reading_logs")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from public.goal_records")).rows,
  ).toHaveLength(0);
  expect(
    (await as("select public.get_reading_books() as books")).rows[0].books,
  ).toMatchObject([{ current_page: 0 }]);
});
it("isolates reads and writes by owner and rejects stale completion", async () => {
  const id = await create();
  const row = (await as("select * from public.actions where id=$1", [id]))
    .rows[0];
  expect(
    (await as("select public.get_area_actions($1) as items", [area], B)).rows[0]
      .items,
  ).toEqual([]);
  await expect(
    as(
      "select public.complete_area_action($1,true,$2)",
      [id, row.updated_at],
      B,
    ),
  ).rejects.toMatchObject({ code: "40001" });
  await as("select public.complete_area_action($1,true,$2)", [
    id,
    row.updated_at,
  ]);
  await expect(
    as("select public.complete_area_action($1,false,$2)", [id, row.updated_at]),
  ).rejects.toMatchObject({ code: "40001" });
});
it("rejects books and objectives from a different area or owner", async () => {
  const other = (
    await as("select public.create_area('Outra','book-open','#F4BD55') as id")
  ).rows[0].id;
  await expect(create({ area_id: other })).rejects.toMatchObject({
    code: "23514",
  });
  const objective = (
    await as(
      "insert into public.objectives(user_id,area_id,title,type,state) values($1,$2,'Other objective','QUALITATIVE','ACTIVE') returning id",
      [A, other],
    )
  ).rows[0].id;
  await expect(create({ objective_id: objective })).rejects.toMatchObject({
    code: "23514",
  });
  await expect(
    as(
      "select public.save_area_action($1,$2)",
      [payload(), crypto.randomUUID()],
      B,
    ),
  ).rejects.toThrow();
});
it("supports actions without a book and guards create retries and invalid dates", async () => {
  const id = await create({ book_id: "", due_on: "", due_time: "" });
  await create({ book_id: "", due_on: "", due_time: "" }, id);
  expect((await db.query("select * from public.actions")).rows).toHaveLength(1);
  await expect(
    create({ title: "Different", book_id: "", due_on: "", due_time: "" }, id),
  ).rejects.toMatchObject({ code: "22023" });
  await expect(create({ due_on: "" })).rejects.toMatchObject({ code: "23514" });
});
