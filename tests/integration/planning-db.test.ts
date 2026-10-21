import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
async function as<T = Record<string, unknown>>(
  id: string | null,
  sql: string,
  args: unknown[] = [],
) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
  try {
    return await db.query<T>(sql, args);
  } finally {
    await db.exec("reset role");
  }
}
const goalData = (extra: Record<string, unknown> = {}) => ({
  title: "Ler 70 páginas",
  type: "QUANTITY",
  unit: "páginas",
  target: "70",
  basis: "WEEKLY",
  frequency_mode: "OCCURRENCES",
  expected_observations: 7,
  observation_unit: "dias",
  objective_id: null,
  state: "ACTIVE",
  ...extra,
});
let areaA: string, areaB: string;
async function createGoal(
  extra: Record<string, unknown> = {},
  user = A,
  area = areaA,
  date = "2026-10-19",
) {
  return (
    await as<{ id: string }>(
      user,
      "select public.save_weekly_goal($1,$2,$3) as id",
      [date, area, goalData(extra)],
    )
  ).rows[0].id;
}
async function record(
  goal: string,
  value: string | null = "56",
  extra: Record<string, unknown> = {},
  user = A,
) {
  return (
    await as<{ id: string }>(
      user,
      "select public.save_goal_record($1,$2) as id",
      [
        goal,
        {
          recorded_on: "2026-10-20",
          value,
          completed: null,
          operation_id: crypto.randomUUID(),
          ...extra,
        },
      ],
    )
  ).rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
  );
  for (const file of [
    "202610200001_foundation.sql",
    "202610200002_planning_performance.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
});
beforeEach(async () => {
  await db.exec("reset role;truncate auth.users cascade;");
  await db.query("insert into auth.users(id) values ($1),($2)", [A, B]);
  areaA = (
    await as<{ id: string }>(
      A,
      "select public.create_area('Leitura','book-open','#F4BD55') as id",
    )
  ).rows[0].id;
  areaB = (
    await as<{ id: string }>(
      B,
      "select public.create_area('Outra','leaf','#47D6C7') as id",
    )
  ).rows[0].id;
});
afterAll(async () => db?.close());
describe("phase 2 migration and ownership", () => {
  it("creates a unique week and area plan with a canonical manual source", async () => {
    const one = await createGoal();
    await createGoal({ title: "Outra meta" });
    expect((await as(A, "select * from public.weeks")).rows).toHaveLength(1);
    const plans = await as<{ state: string }>(
      A,
      "select * from public.area_weekly_plans",
    );
    expect(plans.rows).toHaveLength(1);
    expect(plans.rows[0].state).toBe("PLANNED");
    expect(
      (await as(A, "select * from public.goal_sources where goal_id=$1", [one]))
        .rows,
    ).toHaveLength(1);
  });
  it("does not duplicate a period after timezone changes", async () => {
    await createGoal();
    await as(A, "update public.profiles set timezone='Europe/Lisbon'");
    await createGoal();
    const rows = (
      await as<{ timezone: string }>(A, "select * from public.weeks")
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].timezone).toBe("America/Sao_Paulo");
  });
  it("derives UTC boundaries from user timezone including DST", async () => {
    await as(A, "update public.profiles set timezone='America/New_York'");
    await createGoal({}, A, areaA, "2026-03-02");
    const r = (
      await as<{ hours: number }>(
        A,
        "select extract(epoch from (ends_at_exclusive-starts_at))/3600 as hours from public.weeks",
      )
    ).rows[0];
    expect(Number(r.hours)).toBe(167);
  });
  it("protects period context from client updates", async () => {
    await createGoal();
    await expect(
      as(A, "update public.weeks set timezone='UTC'"),
    ).rejects.toThrow(/permission denied/);
  });
  it("rejects non-Monday identity", async () => {
    await expect(
      as(A, "select public.ensure_planning_week('2026-10-20')"),
    ).rejects.toThrow();
  });
  it("isolates every new entity from another user", async () => {
    const g = await createGoal();
    await record(g);
    await as(
      A,
      "insert into public.objectives(title,type) values ('Pessoal','QUALITATIVE')",
    );
    for (const table of [
      "objectives",
      "weeks",
      "area_weekly_plans",
      "weekly_goals",
      "goal_sources",
      "goal_records",
    ])
      expect((await as(B, "select * from public." + table)).rows).toHaveLength(
        0,
      );
    expect(
      (
        await as<{ data: { goals: unknown[] } }>(
          B,
          "select public.get_planning_data('2026-10-19') as data",
        )
      ).rows[0].data.goals,
    ).toHaveLength(0);
  });
  it("prevents a plan or goal from referencing another owner area", async () => {
    await expect(createGoal({}, A, areaB)).rejects.toThrow();
    const w = (
      await as<{ id: string }>(
        A,
        "select public.ensure_planning_week('2026-10-19') as id",
      )
    ).rows[0].id;
    await expect(
      as(
        A,
        "insert into public.area_weekly_plans(week_id,area_id) values ($1,$2)",
        [w, areaB],
      ),
    ).rejects.toThrow();
  });
  it("prevents linking another owner objective", async () => {
    const objective = (
      await as<{ id: string }>(
        B,
        "insert into public.objectives(title,type) values ('Privado','QUALITATIVE') returning id",
      )
    ).rows[0].id;
    await expect(createGoal({ objective_id: objective })).rejects.toThrow();
  });
  it("rejects objective area re-assignment that invalidates an existing goal", async () => {
    const objective = (
      await as<{ id: string }>(
        A,
        "insert into public.objectives(title,type,area_id) values ('Ler mais','QUALITATIVE',$1) returning id",
        [areaA],
      )
    ).rows[0].id;
    await createGoal({ objective_id: objective });
    const other = (
      await as<{ id: string }>(
        A,
        "select public.create_area('Saúde','heart','#47D6C7') as id",
      )
    ).rows[0].id;
    await expect(
      as(A, "update public.objectives set area_id=$1 where id=$2", [
        other,
        objective,
      ]),
    ).rejects.toThrow();
  });
  it("prevents records referencing another owner goal", async () => {
    const g = await createGoal();
    await expect(record(g, "56", {}, B)).rejects.toThrow();
    await expect(
      as(
        B,
        "insert into public.goal_records(goal_id,goal_type,recorded_on,value,operation_id) values ($1,'QUANTITY','2026-10-20',1,$2)",
        [g, crypto.randomUUID()],
      ),
    ).rejects.toThrow();
  });
  it("enforces plan/week/area consistency for own IDs too", async () => {
    const g = await createGoal();
    const source = (
      await as<{ plan_id: string; week_id: string }>(
        A,
        "select * from public.weekly_goals where id=$1",
        [g],
      )
    ).rows[0];
    const next = (
      await as<{ id: string }>(
        A,
        "select public.ensure_planning_week('2026-10-26') as id",
      )
    ).rows[0].id;
    await expect(
      as(
        A,
        "insert into public.weekly_goals(user_id,week_id,area_id,plan_id,title,type,unit,target) values ($1,$2,$3,$4,'Inválida','QUANTITY','páginas',70)",
        [A, next, areaA, source.plan_id],
      ),
    ).rejects.toThrow();
  });
  it("enforces unique weekly plans and canonical sources", async () => {
    const g = await createGoal();
    const s = (
      await as<{ week_id: string }>(
        A,
        "select * from public.weekly_goals where id=$1",
        [g],
      )
    ).rows[0];
    await expect(
      as(
        A,
        "insert into public.area_weekly_plans(week_id,area_id) values ($1,$2)",
        [s.week_id, areaA],
      ),
    ).rejects.toThrow();
    await expect(
      as(A, "insert into public.goal_sources(goal_id) values ($1)", [g]),
    ).rejects.toThrow();
  });
  it.each([
    { target: "0" },
    { target: "-1" },
    { target: "NaN" },
    { type: "COMPLETION", target: "2" },
    { type: "FREQUENCY", target: "1.5" },
    { type: "AVERAGE", basis: "DAILY" },
  ])("rejects invalid goal %j", async (extra) => {
    await expect(createGoal(extra)).rejects.toThrow();
  });
  it("keeps exactly entered target even when created midweek", async () => {
    await createGoal();
    expect(
      (
        await as<{ target: string }>(
          A,
          "select target::text from public.weekly_goals",
        )
      ).rows[0].target,
    ).toBe("70");
  });
  it("keeps past and current periods independent", async () => {
    const g = await createGoal();
    await record(g);
    await createGoal({}, A, areaA, "2026-10-26");
    expect(
      (
        await as<{ data: { records: unknown[] } }>(
          A,
          "select public.get_planning_data('2026-10-26') as data",
        )
      ).rows[0].data.records,
    ).toHaveLength(0);
  });
  it("enforces dates, record type, average uniqueness and completion binary values", async () => {
    const q = await createGoal();
    await expect(
      record(q, "1", { recorded_on: "2026-10-26" }),
    ).rejects.toThrow();
    const avg = await createGoal({ type: "AVERAGE", target: "8", unit: "h" });
    await record(avg, "7.4");
    await expect(record(avg, "7.5")).rejects.toThrow();
    const c = await createGoal({
      type: "COMPLETION",
      target: "1",
      unit: "conclusão",
    });
    await expect(record(c, "0.5")).rejects.toThrow();
    await record(c, null, { completed: true });
    await expect(record(c, null, { completed: false })).rejects.toThrow();
  });
  it("idempotent submission does not add execution twice", async () => {
    const g = await createGoal();
    const key = crypto.randomUUID();
    const a = await record(g, "56", { operation_id: key });
    const b = await record(g, "56", { operation_id: key });
    expect(a).toBe(b);
    expect(
      (await as(A, "select * from public.goal_records")).rows,
    ).toHaveLength(1);
    await expect(record(g, "57", { operation_id: key })).rejects.toThrow();
  });
  it("locks measurement semantics after records, but allows target corrections", async () => {
    const g = await createGoal();
    await record(g);
    await expect(
      as(A, "update public.weekly_goals set unit='horas' where id=$1", [g]),
    ).rejects.toThrow(/locked/);
    await as(A, "update public.weekly_goals set target=80 where id=$1", [g]);
  });
  it("soft deletion changes current execution without deleting history", async () => {
    const g = await createGoal();
    const r = await record(g);
    await as(A, "update public.goal_records set is_deleted=true where id=$1", [
      r,
    ]);
    expect(
      (await as(A, "select * from public.goal_records where not is_deleted"))
        .rows,
    ).toHaveLength(0);
    expect(
      (await as(A, "select * from public.goal_records")).rows,
    ).toHaveLength(1);
  });
  it("cancellation updates planning state without assigning zero", async () => {
    const g = await createGoal();
    await as(
      A,
      "update public.weekly_goals set state='CANCELLED' where id=$1",
      [g],
    );
    expect(
      (
        await as<{ state: string }>(
          A,
          "select state from public.area_weekly_plans",
        )
      ).rows[0].state,
    ).toBe("UNPLANNED");
    await expect(
      as(A, "update public.area_weekly_plans set state='PLANNED'"),
    ).rejects.toThrow();
  });
  it("uses RESTRICT for referenced areas and objectives", async () => {
    const o = (
      await as<{ id: string }>(
        A,
        "insert into public.objectives(title,type) values ('Ler','QUALITATIVE') returning id",
      )
    ).rows[0].id;
    await createGoal({ objective_id: o });
    await expect(
      as(A, "delete from public.objectives where id=$1", [o]),
    ).rejects.toThrow(/foreign key/);
    await expect(
      as(A, "delete from public.areas where id=$1", [areaA]),
    ).rejects.toThrow(/foreign key/);
  });
  it("rejects forged ownership and immutable identity updates", async () => {
    const g = await createGoal();
    await expect(
      as(A, "update public.weekly_goals set user_id=$1 where id=$2", [B, g]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(
        A,
        "insert into public.objectives(user_id,title,type) values ($1,'Alheio','QUALITATIVE')",
        [B],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("denies anonymous access to all six tables and application RPCs", async () => {
    await db.exec("set role anon");
    try {
      for (const table of [
        "objectives",
        "weeks",
        "area_weekly_plans",
        "weekly_goals",
        "goal_sources",
        "goal_records",
      ])
        await expect(db.query("select * from public." + table)).rejects.toThrow(
          /permission denied/,
        );
      await expect(
        db.query("select public.get_planning_data('2026-10-19')"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
});
