import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite, area: string, subject: string;
const as = (sql: string, args: unknown[] = [], owner = A) =>
  asUser(db, owner, sql, args);
beforeAll(async () => {
  db = await readingDatabase();
});
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("truncate auth.users cascade");
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
  area = (
    await as(
      "select public.create_area('Aprender','book-open','#F4BD55') as id",
    )
  ).rows[0].id as string;
  subject = crypto.randomUUID();
  await as("select public.save_study_subject($1,$2)", [
    {
      area_id: area,
      title: "Produto",
      target_minutes: 600,
      archived: false,
      objective_id: null,
    },
    subject,
  ]);
});
const log = () => ({
  area_id: area,
  subject_id: subject,
  studied_on: "2026-10-20",
  minutes: 60,
  notes: "",
  is_deleted: false,
});
it("uses shared goals and canonical sessions without manual record copies; supports goal editing", async () => {
  const goal = {
    title: "Estudar",
    target: "300",
    objective_id: null,
    state: "ACTIVE",
  };
  const gid = (
    await as("select public.save_study_goal('2026-10-19',$1,$2) as id", [
      area,
      goal,
    ])
  ).rows[0].id;
  await as("select public.save_study_session($1,$2)", [
    log(),
    crypto.randomUUID(),
  ]);
  const source = (
    await as("select * from public.goal_sources where goal_id=$1", [gid])
  ).rows[0];
  expect(source).toMatchObject({
    module: "STUDIES",
    metric: "MINUTES_STUDIED",
    scope: "ALL_SUBJECTS",
  });
  expect(
    (await as("select public.get_study_planning_data() as data")).rows[0].data,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from public.goal_records")).rows,
  ).toHaveLength(0);
  const row = (await as("select * from public.weekly_goals where id=$1", [gid]))
    .rows[0];
  await as("select public.save_study_goal('2026-10-19',$1,$2,$3)", [
    area,
    { ...goal, target: "360", expected_updated_at: row.updated_at },
    gid,
  ]);
  await expect(
    as("select public.save_goal_record($1,$2)", [
      gid,
      {
        recorded_on: "2026-10-20",
        value: 60,
        operation_id: crypto.randomUUID(),
      },
    ]),
  ).rejects.toThrow();
});
it("isolates owners, rejects foreign subjects, retries idempotently and prevents lost edits", async () => {
  const id = crypto.randomUUID();
  await as("select public.save_study_session($1,$2)", [log(), id]);
  await as("select public.save_study_session($1,$2)", [log(), id]);
  expect(
    (await as("select public.get_studies_data($1) as data", [area], B)).rows[0]
      .data,
  ).toEqual({ subjects: [], sessions: [] });
  await expect(
    as(
      "select public.save_study_session($1,$2)",
      [log(), crypto.randomUUID()],
      B,
    ),
  ).rejects.toThrow();
  await expect(
    as("select public.save_study_session($1,$2)", [
      { ...log(), minutes: 61 },
      id,
    ]),
  ).rejects.toMatchObject({ code: "22023" });
  const row = (
    await as("select * from public.study_sessions where id=$1", [id])
  ).rows[0];
  await as("select public.save_study_session($1,$2,$3)", [
    { ...log(), minutes: 90 },
    id,
    row.updated_at,
  ]);
  await expect(
    as("select public.save_study_session($1,$2,$3)", [
      log(),
      id,
      row.updated_at,
    ]),
  ).rejects.toMatchObject({ code: "40001" });
  expect(
    (await as("select public.get_study_planning_data() as data")).rows[0].data,
  ).toMatchObject([{ minutes: 90 }]);
  const current = (
    await as("select * from public.study_sessions where id=$1", [id])
  ).rows[0];
  await as("select public.save_study_session($1,$2,$3)", [
    { ...log(), is_deleted: true },
    id,
    current.updated_at,
  ]);
  expect(
    (await as("select public.get_study_planning_data() as data")).rows[0].data,
  ).toEqual([]);
});
it("rejects invalid duration, future sessions and cross-area subject links", async () => {
  for (const minutes of [0, -1, 1441])
    await expect(
      as("select public.save_study_session($1,$2)", [
        { ...log(), minutes },
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow();
  await expect(
    as("select public.save_study_session($1,$2)", [
      { ...log(), studied_on: "9999-01-01" },
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow();
  const other = (
    await as("select public.create_area('Outra','book-open','#F4BD55') as id")
  ).rows[0].id;
  await expect(
    as("select public.save_study_session($1,$2)", [
      { ...log(), area_id: other },
      crypto.randomUUID(),
    ]),
  ).rejects.toMatchObject({ code: "23503" });
});
