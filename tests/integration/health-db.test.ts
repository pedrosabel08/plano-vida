import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readingDatabase, asUser, A, B } from "../helpers/reading-db";
let db: PGlite, area: string;
const as = (sql: string, args: unknown[] = [], owner = A) =>
  asUser(db, owner, sql, args);
const save = (
  name: string,
  item: unknown,
  id = crypto.randomUUID(),
  expected?: unknown,
) =>
  as(`select public.save_${name}($1,$2,$3) as id`, [
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
    await as("select public.create_area('Cuidado','heart','#47D6C7') as id")
  ).rows[0].id as string;
});
const night = () => ({
  area_id: area,
  bed_at: "2026-10-20T02:00Z",
  wake_at: "2026-10-20T10:00Z",
  timezone: "America/Sao_Paulo",
  energy: 3,
  is_deleted: false,
});
it("persists true instants and wake date, protects one main night, ownership, overlaps and stale edits", async () => {
  const id = crypto.randomUUID();
  await save("sleep_log", night(), id);
  await save("sleep_log", night(), id);
  const row = (await as("select * from public.sleep_logs where id=$1", [id]))
    .rows[0];
  expect(new Date(row.wake_on as string).toISOString().slice(0, 10)).toBe(
    "2026-10-20",
  );
  expect(
    (await as("select public.get_health_data($1) as data", [area], B)).rows[0]
      .data,
  ).toMatchObject({ nights: [] });
  await expect(
    as(
      "select public.save_sleep_log($1,$2)",
      [night(), crypto.randomUUID()],
      B,
    ),
  ).rejects.toThrow();
  await expect(
    save("sleep_log", { ...night(), wake_at: "2026-10-20T11:00Z" }),
  ).rejects.toThrow();
  await save("sleep_log", { ...night(), energy: 4 }, id, row.updated_at);
  await expect(
    save("sleep_log", night(), id, row.updated_at),
  ).rejects.toMatchObject({ code: "40001" });
  await expect(
    save("sleep_log", { ...night(), bed_at: "2026-10-19T01:00Z" }),
  ).rejects.toThrow();
});
it("allows correction/removal and rejects future nights and invalid energy", async () => {
  const id = crypto.randomUUID();
  await save("sleep_log", night(), id);
  const row = (await as("select * from public.sleep_logs where id=$1", [id]))
    .rows[0];
  await save("sleep_log", { ...night(), is_deleted: true }, id, row.updated_at);
  await save("sleep_log", night());
  await expect(
    save("sleep_log", {
      ...night(),
      bed_at: "2099-01-01T00:00Z",
      wake_at: "2099-01-01T08:00Z",
    }),
  ).rejects.toThrow();
  await expect(save("sleep_log", { ...night(), energy: 6 })).rejects.toThrow();
});
it("preserves routine schedule, rejects checks outside dates and other owners and stores daily toggles", async () => {
  const id = crypto.randomUUID(),
    routine = {
      area_id: area,
      title: "Minha rotina bucal",
      kind: "ORAL",
      starts_on: "2026-10-19",
      ends_on: null,
    };
  await save("health_routine", routine, id);
  const check = crypto.randomUUID(),
    payload = {
      area_id: area,
      routine_id: id,
      completed_on: "2026-10-20",
      completed: true,
    };
  await save("routine_check", payload, check);
  await save("routine_check", payload, check);
  await expect(
    save("routine_check", { ...payload, completed_on: "2026-10-18" }),
  ).rejects.toThrow();
  await expect(
    save("routine_check", { ...payload, completed_on: "2099-01-01" }),
  ).rejects.toThrow();
  const row = (
    await as("select * from public.health_routines where id=$1", [id])
  ).rows[0];
  await expect(
    save(
      "health_routine",
      { ...routine, starts_on: "2026-10-20" },
      id,
      row.updated_at,
    ),
  ).rejects.toThrow();
  await expect(
    save(
      "health_routine",
      { ...routine, ends_on: "2026-10-20" },
      id,
      row.updated_at,
    ),
  ).rejects.toThrow();
  const c = (
    await as("select * from public.routine_checks where id=$1", [check])
  ).rows[0];
  await save(
    "routine_check",
    { ...payload, completed: false },
    check,
    c.updated_at,
  );
  expect(
    (await as("select public.get_health_data($1) as data", [area])).rows[0]
      .data,
  ).toMatchObject({ checks: [{ completed: false }] });
});
