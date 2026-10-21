import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
export const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
export async function readingDatabase() {
  const db = new PGlite();
  await db.exec(
    "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
  );
  for (const f of [
    "202610200001_foundation.sql",
    "202610200002_planning_performance.sql",
    "202610200003_reading_module.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  return db;
}
export async function asUser<T = Record<string, unknown>>(
  db: PGlite,
  id: string,
  sql: string,
  args: unknown[] = [],
) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  try {
    return await db.query<T>(sql, args);
  } finally {
    await db.exec("reset role");
  }
}
