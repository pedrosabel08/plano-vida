import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
it("runs the exact remote RLS script and rolls every fixture back", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
    );
    for (const file of [
      "202610200001_foundation.sql",
      "202610200002_planning_performance.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    const result = await db.exec(
      await readFile("supabase/tests/planning-rls.sql", "utf8"),
    );
    const assertionResult = result.find((r) =>
      r.fields.some((f) => f.name === "passed_assertions"),
    );
    expect(assertionResult?.rows[0]).toMatchObject({ passed_assertions: 38 });
    expect((await db.query("select * from auth.users")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from public.weekly_goals")).rows,
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
});
