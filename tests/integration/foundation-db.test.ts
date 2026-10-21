import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
async function asUser<T>(id: string | null, sql: string, args: unknown[] = []) {
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
async function create(id = A, name = "Leitura") {
  const result = await asUser<{ id: string }>(
    id,
    "select public.create_area($1,$2,$3) as id",
    [name, "book-open", "#F4BD55"],
  );
  return result.rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 create role anon nologin; create role authenticated nologin;
 create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 grant execute on function auth.uid() to authenticated,anon;
`);
  await db.exec(
    await readFile("supabase/migrations/202610200001_foundation.sql", "utf8"),
  );
});
beforeEach(async () => {
  await db.exec("reset role; truncate auth.users cascade;");
  await db.query(
    "insert into auth.users(id,raw_user_meta_data) values ($1,$2),($3,$4)",
    [A, { full_name: "Pedro" }, B, { full_name: "Outra pessoa" }],
  );
});
afterAll(async () => {
  await db?.close();
});
describe("real PostgreSQL migration and ownership", () => {
  it("creates only a profile with the approved default, without areas", async () => {
    const r = await asUser<{ timezone: string; onboarding_completed_at: null }>(
      A,
      "select * from public.profiles",
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].timezone).toBe("America/Sao_Paulo");
    expect(r.rows[0].onboarding_completed_at).toBeNull();
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      0,
    );
  });
  it("allows own area create, read, update and delete", async () => {
    const id = await create();
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      1,
    );
    await asUser(A, "update public.areas set name=$1 where id=$2", [
      "Estudos",
      id,
    ]);
    expect(
      (await asUser<{ name: string }>(A, "select name from public.areas"))
        .rows[0].name,
    ).toBe("Estudos");
    await asUser(A, "delete from public.areas where id=$1", [id]);
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      0,
    );
  });
  it("isolates reads between two authenticated users", async () => {
    await create();
    expect((await asUser(B, "select * from public.areas")).rows).toHaveLength(
      0,
    );
    expect(
      (await asUser(B, "select * from public.profiles where user_id=$1", [A]))
        .rows,
    ).toHaveLength(0);
  });
  it("rejects an insert for another owner", async () => {
    await expect(
      asUser(
        A,
        "insert into public.areas(user_id,name,icon,color,sort_order) values ($1,$2,$3,$4,0)",
        [B, "Alheia", "leaf", "#123456"],
      ),
    ).rejects.toThrow(/row-level security/i);
  });
  it("cannot edit or delete another owner area", async () => {
    const id = await create();
    expect(
      (
        await asUser(
          B,
          "update public.areas set name=$1 where id=$2 returning id",
          ["Ataque", id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(B, "delete from public.areas where id=$1 returning id", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await asUser<{ name: string }>(A, "select name from public.areas"))
        .rows[0].name,
    ).toBe("Leitura");
  });
  it("cannot change area ownership or timestamps through granted columns", async () => {
    const id = await create();
    await expect(
      asUser(A, "update public.areas set user_id=$1 where id=$2", [B, id]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("isolates profile updates and rejects forged ownership", async () => {
    expect(
      (
        await asUser(
          B,
          "update public.profiles set display_name=$1 where user_id=$2 returning user_id",
          ["Ataque", A],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      asUser(A, "update public.profiles set user_id=$1", [B]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("denies anonymous table access and RPC execution", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.areas")).rejects.toThrow(
        /permission denied/i,
      );
      await expect(
        db.query("select public.create_area('x','leaf','#123456')"),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("reset role");
    }
  });
  it("denies an authenticated role without a user identity", async () => {
    await expect(
      asUser(null, "select public.create_area('x','leaf','#123456')"),
    ).rejects.toThrow(/Authentication required/);
    expect(
      (await asUser(null, "select * from public.profiles")).rows,
    ).toHaveLength(0);
  });
  it("reorders the complete owned set atomically", async () => {
    const first = await create(A, "Primeira");
    const second = await create(A, "Segunda");
    await asUser(A, "select public.reorder_areas($1)", [[second, first]]);
    expect(
      (
        await asUser<{ id: string }>(
          A,
          "select id from public.areas order by sort_order",
        )
      ).rows.map((r) => r.id),
    ).toEqual([second, first]);
  });
  it("rejects missing, duplicate and foreign IDs without changing order", async () => {
    const first = await create(A, "Primeira");
    const second = await create(A, "Segunda");
    const foreign = await create(B, "Outra");
    for (const ids of [[first], [first, first], [first, foreign]])
      await expect(
        asUser(A, "select public.reorder_areas($1)", [ids]),
      ).rejects.toThrow(/Area list changed/);
    expect(
      (
        await asUser<{ id: string }>(
          A,
          "select id from public.areas order by sort_order",
        )
      ).rows.map((r) => r.id),
    ).toEqual([first, second]);
  });
  it("finishes onboarding with no areas and is idempotent", async () => {
    await asUser(A, "select public.complete_onboarding($1,$2,$3)", [
      "Pedro",
      "America/Sao_Paulo",
      [],
    ]);
    await asUser(A, "select public.complete_onboarding($1,$2,$3)", [
      "Outro",
      "UTC",
      [{ name: "Não criar", icon: "leaf", color: "#123456" }],
    ]);
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      0,
    );
    expect(
      (
        await asUser<{ display_name: string }>(
          A,
          "select display_name from public.profiles",
        )
      ).rows[0].display_name,
    ).toBe("Pedro");
  });
  it("creates only explicitly selected onboarding areas", async () => {
    const areas = [
      { name: "Leitura e estudos", icon: "book-open", color: "#F4BD55" },
    ];
    await asUser(A, "select public.complete_onboarding($1,$2,$3)", [
      "Pedro",
      "America/Sao_Paulo",
      areas,
    ]);
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      1,
    );
    expect((await asUser(B, "select * from public.areas")).rows).toHaveLength(
      0,
    );
  });
  it("rolls back onboarding when any area is invalid", async () => {
    await expect(
      asUser(A, "select public.complete_onboarding($1,$2,$3)", [
        "Pedro",
        "UTC",
        [
          { name: "Válida", icon: "leaf", color: "#123456" },
          { name: "Inválida", icon: "script", color: "#123456" },
        ],
      ]),
    ).rejects.toThrow();
    expect((await asUser(A, "select * from public.areas")).rows).toHaveLength(
      0,
    );
    expect(
      (
        await asUser<{ onboarding_completed_at: null }>(
          A,
          "select onboarding_completed_at from public.profiles",
        )
      ).rows[0].onboarding_completed_at,
    ).toBeNull();
  });
  it("validates timezones in the database", async () => {
    await expect(
      asUser(A, "update public.profiles set timezone=$1", ["Mars/Olympus"]),
    ).rejects.toThrow(/Invalid timezone/);
    await asUser(A, "update public.profiles set timezone=$1", [
      "Europe/Lisbon",
    ]);
    expect(
      (
        await asUser<{ timezone: string }>(
          A,
          "select timezone from public.profiles",
        )
      ).rows[0].timezone,
    ).toBe("Europe/Lisbon");
  });
  it.each([
    ["", "leaf", "#123456"],
    ["Área", "unknown", "#123456"],
    ["Área", "leaf", "red"],
  ])(
    "validates data independently of the UI: %s",
    async (name, icon, color) => {
      await expect(
        asUser(A, "select public.create_area($1,$2,$3)", [name, icon, color]),
      ).rejects.toThrow();
    },
  );
});
