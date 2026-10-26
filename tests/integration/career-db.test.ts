import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite, area: string, project: string;
const as = (sql: string, args: unknown[] = [], owner = A) =>
  asUser(db, owner, sql, args);
const save = (
  name: string,
  item: unknown,
  id = crypto.randomUUID(),
  expected?: unknown,
) =>
  as(`select public.save_career_${name}($1,$2,$3) as id`, [
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
    await as(
      "select public.create_area('Profissão','briefcase','#9690FF') as id",
    )
  ).rows[0].id as string;
  project = crypto.randomUUID();
  await save(
    "project",
    {
      area_id: area,
      title: "Produto",
      kind: "WORK",
      due_on: "2026-12-01",
      objective_id: null,
      status: "ACTIVE",
    },
    project,
  );
});
it("persists milestones, commitments and reviews without subjective scores; rejects stale updates", async () => {
  const item = {
      area_id: area,
      project_id: project,
      title: "Entrega",
      kind: "DELIVERY",
      due_on: "2026-10-20",
      completed_on: null,
      is_deleted: false,
    },
    id = crypto.randomUUID();
  await save("milestone", item, id);
  await save("milestone", item, id);
  const row = (
    await as("select * from public.career_milestones where id=$1", [id])
  ).rows[0];
  await save(
    "milestone",
    { ...item, completed_on: "2026-10-20" },
    id,
    row.updated_at,
  );
  await expect(
    save("milestone", item, id, row.updated_at),
  ).rejects.toMatchObject({ code: "40001" });
  await save("commitment", { ...item, kind: "MEETING" });
  await save("review", {
    area_id: area,
    reviewed_on: "2026-10-20",
    wins: "Entreguei a primeira versão",
    lessons: "Validar cedo",
    next_steps: "Coletar retorno",
  });
  expect(
    (await as("select public.get_career_data($1) as data", [area])).rows[0]
      .data,
  ).toMatchObject({
    projects: [{ title: "Produto" }],
    milestones: [{ completed_on: "2026-10-20" }],
    commitments: [{ kind: "MEETING" }],
    reviews: [{ wins: "Entreguei a primeira versão" }],
  });
});
it("isolates ownership, area links, study sources and future completions", async () => {
  expect(
    (await as("select public.get_career_data($1) as data", [area], B)).rows[0]
      .data,
  ).toMatchObject({ projects: [], milestones: [], study_sessions: [] });
  const other = (
    await as("select public.create_area('Outra','briefcase','#9690FF') as id")
  ).rows[0].id;
  await expect(
    save("milestone", {
      area_id: other,
      project_id: project,
      title: "Inválido",
      kind: "TASK",
      due_on: null,
      completed_on: null,
      is_deleted: false,
    }),
  ).rejects.toMatchObject({ code: "23503" });
  await expect(
    save("milestone", {
      area_id: area,
      project_id: project,
      title: "Futuro",
      kind: "TASK",
      due_on: null,
      completed_on: "2099-01-01",
      is_deleted: false,
    }),
  ).rejects.toThrow();
  await save("setting", {
    area_id: area,
    study_area_id: other,
    study_target_minutes: 300,
    objective_id: null,
  });
  expect(
    (await as("select public.get_career_data($1) as data", [area])).rows[0]
      .data,
  ).toMatchObject({ settings: [{ study_area_id: other }] });
});
