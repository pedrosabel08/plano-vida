import { afterAll, beforeAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite;
beforeAll(async () => {
  db = await readingDatabase();
  await db.query("insert into auth.users(id) values($1),($2)", [A, B]);
});
afterAll(async () => db?.close());
const tables = [
  "study_subjects",
  "study_sessions",
  "finance_categories",
  "finance_transactions",
  "finance_budgets",
  "finance_goals",
  "finance_contributions",
  "career_projects",
  "career_milestones",
  "career_commitments",
  "career_settings",
  "career_reviews",
  "health_settings",
  "sleep_logs",
  "health_routines",
  "routine_checks",
  "area_dashboard_preferences",
];
it("forces RLS, denies anonymous access, deletion and ownership edits on every new table", async () => {
  for (const name of tables) {
    const r = (
      await db.query<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
        anon_select: boolean;
        owner_update: boolean;
        delete_allowed: boolean;
      }>(
        "select c.relrowsecurity,c.relforcerowsecurity,has_table_privilege('anon',c.oid,'SELECT') as anon_select,has_column_privilege('authenticated',c.oid,'user_id','UPDATE') as owner_update,has_table_privilege('authenticated',c.oid,'DELETE') as delete_allowed from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1",
        [name],
      )
    ).rows[0];
    expect(r, name).toEqual({
      relrowsecurity: true,
      relforcerowsecurity: true,
      anon_select: false,
      owner_update: false,
      delete_allowed: false,
    });
  }
});
it("binds default dashboards to owned area IDs and rejects unknown dashboard names", async () => {
  const area = (
    await asUser(
      db,
      A,
      "select public.create_area('Nome mutável','briefcase','#9690FF') as id",
    )
  ).rows[0].id;
  await asUser(db, A, "select public.set_area_dashboard($1,'carreira')", [
    area,
  ]);
  expect(
    (
      await asUser(db, A, "select public.get_area_dashboard($1) as value", [
        area,
      ])
    ).rows[0].value,
  ).toBe("carreira");
  expect(
    (
      await asUser(db, B, "select public.get_area_dashboard($1) as value", [
        area,
      ])
    ).rows[0].value,
  ).toBe(null);
  await expect(
    asUser(db, B, "select public.set_area_dashboard($1,'saude')", [area]),
  ).rejects.toThrow();
  await expect(
    asUser(db, A, "select public.set_area_dashboard($1,'arbitrary')", [area]),
  ).rejects.toThrow();
  await asUser(db, A, "update public.areas set name='Renomeada' where id=$1", [
    area,
  ]);
  expect(
    (
      await asUser(db, A, "select public.get_area_dashboard($1) as value", [
        area,
      ])
    ).rows[0].value,
  ).toBe("carreira");
});
it("protects the existing reading module from receiving books under a study association", async () => {
  const area = (
    await asUser(
      db,
      A,
      "select public.create_area('Estudos','book-open','#F4BD55') as id",
    )
  ).rows[0].id;
  await asUser(db, A, "select public.save_study_goal('2026-10-19',$1,$2)", [
    area,
    { title: "Estudar", target: 60, state: "ACTIVE", objective_id: null },
  ]);
  const mid = (
    await asUser(
      db,
      A,
      "select id from public.area_modules where area_id=$1 and module='STUDIES'",
      [area],
    )
  ).rows[0].id;
  await expect(
    asUser(db, A, "select public.save_reading_book($1,$2)", [
      mid,
      {
        title: "Inválido",
        authors: [],
        status: "READING",
        initial_tracking_page: 0,
        total_pages: 100,
      },
    ]),
  ).rejects.toThrow();
});
it("enforces past execution dates for direct authenticated writes as well as RPC calls", async () => {
  const area = (
    await asUser(
      db,
      A,
      "select public.create_area('Datas','book-open','#F4BD55') as id",
    )
  ).rows[0].id;
  const sid = crypto.randomUUID();
  await asUser(db, A, "select public.save_study_subject($1,$2)", [
    {
      area_id: area,
      title: "Estudo",
      target_minutes: null,
      archived: false,
      objective_id: null,
    },
    sid,
  ]);
  await expect(
    asUser(
      db,
      A,
      "insert into public.study_sessions(id,area_id,subject_id,studied_on,minutes,notes,is_deleted) values($1,$2,$3,'2099-01-01',1,'',false)",
      [crypto.randomUUID(), area, sid],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    asUser(db, A, "select public.save_career_review($1,$2)", [
      {
        area_id: area,
        reviewed_on: "2099-01-01",
        wins: "Futuro",
        lessons: "",
        next_steps: "",
      },
      crypto.randomUUID(),
    ]),
  ).rejects.toMatchObject({ code: "23514" });
});
